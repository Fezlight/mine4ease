import {Logger} from "winston";
import {v4 as uuidv4} from "uuid";
import {EventEmitter} from 'events';

export class Queue<T> {
  private _items: { [key: number]: T };
  private tailIndex: number;
  private headIndex: number;

  constructor() {
    this._items = {};
    this.tailIndex = 0;
    this.headIndex = 0;
  }

  enqueue(item: T) {
    this._items[this.tailIndex] = item;
    this.tailIndex++;
  }

  pop() {
    const item = this._items[this.headIndex];
    delete this._items[this.headIndex];
    this.headIndex++;
    return item;
  }

  peek() {
    return this._items[this.headIndex];
  }

  wipe() {
    this._items = {};
  }

  get length() {
    return this.tailIndex - this.headIndex;
  }

  get items() {
    return Object.values(this._items);
  }
}

export interface TaskOptions {

}

export const TASK_EVENT_NAME = "task-event"
export const ADD_TASK_EVENT_NAME = "add-task-event"

export interface TaskEvent {
  id: string;
  name: string;
  state: TaskState;
}

export type TaskState = "FINISHED" | "CREATED" | "PAUSED" | "IN_PROGRESS" | "FAILED" | "RETRY_NEEDED";

export class TaskRunner {
  private queue = new Queue<Task>();
  private log: Logger;
  private isProcessing = false;
  private readonly autoWipeQueueOnFail: boolean;
  private readonly propageError: boolean;

  constructor(log: Logger, eventEmitter: EventEmitter, autoWipeQueueOnFail: boolean = true, propageError: boolean = true) {
    this.log = log;
    this.autoWipeQueueOnFail = autoWipeQueueOnFail;
    this.propageError = propageError;
    eventEmitter.on(ADD_TASK_EVENT_NAME, (task: Task, processing: boolean = true) => {
      this.addTask(task, processing);
    })
  }

  private splitToChunks(items: Task[], chunkSize = 20): Task[][] {
    const result: Task[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      result.push(items.slice(i, i + chunkSize));
    }
    return result;
  }

  async process(sequential = true) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    if (sequential) {
      await this.processSequential()
    } else {
      await this.processParallel();
    }

    this.isProcessing = false;
  }

  async processParallel(): Promise<void> {
    const chunkTask = this.splitToChunks(this.queue.items);

    for (const task of chunkTask) {
      const promises = task.map(task => {
        return task.runTask().catch(error => this.onFailed(error))
      });

      await Promise.all(promises);
    }
  }

  async processSequential() {
    while (this.queue.length > 0) {
      const task = this.queue.pop();

      await task.runTask()
      .catch(error => this.onFailed(error));
    }
  }

  addTask(task: Task, processing: boolean = false) {
    this.queue.enqueue(task);
    if (processing) {
      this.process()
        .catch(error => this.onFailed(error))
        .catch(e => this.log.error(e.message));
    }
  }

  onFailed(error: any) {
    if (this.autoWipeQueueOnFail) {
      this.queue.wipe();
    }
    if(this.propageError) {
      throw error;
    }
  }

  currentTask(): Task {
    return this.queue.peek();
  }
}

export abstract class Task {
  protected _state: TaskState;
  protected readonly _name: string;
  protected readonly _id: string;
  protected readonly _log: Logger;
  protected readonly _eventEmitter: EventEmitter;
  private readonly _eventCanceled: boolean;

  protected constructor(eventEmitter: EventEmitter, log: Logger, getName: () => string, eventCanceled: boolean = false) {
    this._id = uuidv4();
    this._name = getName();
    this._eventEmitter = eventEmitter;
    this._log = log;
    this._log.debug(this._name);
    this._eventCanceled = eventCanceled;
    this.onCreated();
  }

  abstract run(): Promise<void>;

  async runTask() {
    this.state = "IN_PROGRESS";
    this._log.debug(`Running task ${this._name}`);
    return this.run()
    .then(() => this.onFinished())
    .catch(e => this.onErrored(e));
  }

  set state(state: TaskState) {
    this._state = state;
    this.sendEvent();
  }

  get state() {
    return this._state;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  sendEvent() {
    if (this._eventCanceled) return;

    const event: TaskEvent = {
      id: this.id,
      state: this.state,
      name: this.name
    };

    this._eventEmitter.emit(TASK_EVENT_NAME, event);
  }

  onCreated() {
    this.state = "CREATED";
  }

  onErrored(e: Error) {
    this.state = "FAILED";
    this._log.error("", e);
    throw new Error(`${this._name} failed`);
  }

  onFinished() {
    this.state = "FINISHED";
  }

  onPaused() {
    this.state = "PAUSED";
  }
}
