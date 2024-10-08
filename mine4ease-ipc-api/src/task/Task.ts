import {Logger} from "winston";
import {v4 as uuidv4} from "uuid";
import {EventEmitter} from 'events';

export class Queue<T> {
  private tailIndex: number;
  private headIndex: number;

  constructor() {
    this.init();
  }

  private _items: { [key: number]: T };

  get items() {
    return Object.values(this._items);
  }

  get length() {
    return this.tailIndex - this.headIndex;
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

  popAll() {
    const items = this.items;
    this.init();
    return items;
  }

  peek() {
    return this._items[this.headIndex];
  }

  wipe() {
    this.init();
  }

  init() {
    this._items = {};
    this.tailIndex = 0;
    this.headIndex = 0;
  }
}

export interface TaskOptions {
  autoWipeQueueOnFail?: boolean,
  propagateError?: boolean,
  eventCancelled?: boolean
}

export const TASK_EVENT_NAME = "task-event";
export const TASK_PROCESSING_EVENT_NAME = "task-processing-event";
export const ADD_TASK_EVENT_NAME = "add-task-event";
export const ADD_MOD_EVENT_NAME = "add-mod-event";
export const DELETE_MOD_EVENT_NAME = "delete-mod-event";
export const UPDATE_MOD_EVENT_NAME = "update-mod-event";
export const GAME_LAUNCHED_EVENT_NAME = "game-launched-event";
export const GAME_EXITED_EVENT_NAME = "game-exited-event";

export interface TaskEvent {
  id: string;
  name: string;
  state: TaskState;
  object?: any;
}

export type TaskState = "FINISHED" | "CREATED" | "PAUSED" | "IN_PROGRESS" | "FAILED" | "RETRY_NEEDED";

export class TaskRunner {
  private queue = new Queue<Task>();
  private isProcessing = false;
  private readonly _log: Logger;
  private readonly _autoWipeQueueOnFail: boolean;
  private readonly _propagateError: boolean;
  private readonly _eventEmitter: EventEmitter;
  private readonly _eventCancelled: boolean;

  constructor(log: Logger, eventEmitter: EventEmitter, mainEventEmitter?: EventEmitter, taskOptions?: TaskOptions) {
    this._log = log;
    this._eventEmitter = eventEmitter;
    this._autoWipeQueueOnFail = taskOptions?.autoWipeQueueOnFail ?? true;
    this._propagateError = taskOptions?.propagateError ?? true;
    this._eventCancelled = taskOptions?.eventCancelled ?? false;
    if (!this._eventCancelled && mainEventEmitter) {
      eventEmitter.on(TASK_EVENT_NAME, event => {
        mainEventEmitter.emit(TASK_EVENT_NAME, event);
      });
      eventEmitter.on(TASK_PROCESSING_EVENT_NAME, event => {
        mainEventEmitter.emit(TASK_PROCESSING_EVENT_NAME, event);
      });
    }
    eventEmitter.on(ADD_TASK_EVENT_NAME, (task: Task, processing: boolean = true) => {
      this.addTask(task, processing);
    });
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
    this._eventEmitter.emit(TASK_PROCESSING_EVENT_NAME, 100);
  }

  addTask(task: Task, processing: boolean = false) {
    this.queue.enqueue(task);
    if (processing) {
      this.process()
      .catch(error => this.onFailed(error))
      .catch(e => this._log.error(e.message));
    }
  }

  onFailed(error: any) {
    if (this._autoWipeQueueOnFail) {
      this.queue.wipe();
    }
    if (this._propagateError) {
      throw error;
    }
  }

  currentTask(): Task {
    return this.queue.peek();
  }

  private splitToChunks(items: Task[], chunkSize = 20): Task[][] {
    const result: Task[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      result.push(items.slice(i, i + chunkSize));
    }
    return result;
  }

  private async processParallel(): Promise<void> {
    let initialSize = this.queue.length;
    const chunkTask = this.splitToChunks(this.queue.popAll());

    let achieved = 0;
    for (const task of chunkTask) {
      const promises = task.map(task => {
        return task.runTask().catch(error => this.onFailed(error))
      });

      await Promise.all(promises);
      achieved += task.length;
      this._eventEmitter.emit(TASK_PROCESSING_EVENT_NAME, Math.round((achieved / initialSize) * 100))
    }
  }

  private async processSequential() {
    let initialSize = this.queue.length;

    let achieved = 0;
    while (this.queue.length > 0) {
      const task = this.queue.pop();

      await task.runTask()
      .catch(error => this.onFailed(error))
      .finally(() => this._eventEmitter.emit(TASK_PROCESSING_EVENT_NAME, Math.round((++achieved / initialSize) * 100)));
    }
  }
}

export abstract class Task {
  protected readonly _name: string;
  protected readonly _id: string;
  protected readonly _log: Logger;
  protected readonly _eventEmitter: EventEmitter;
  protected readonly _eventCancelled: boolean;

  protected constructor(eventEmitter: EventEmitter, log: Logger, getName: () => string, eventCancelled: boolean = false) {
    this._id = uuidv4();
    this._name = getName();
    this._eventEmitter = eventEmitter;
    this._log = log;
    this._log.debug(this._name);
    this._eventCancelled = eventCancelled;
    this.onCreated();
  }

  protected _state: TaskState;

  get state() {
    return this._state;
  }

  set state(state: TaskState) {
    this._state = state;
    this.sendEvent();
  }

  protected _object: any;

  get object() {
    return this._object;
  }

  get id() {
    return this._id;
  }

  get name() {
    return this._name;
  }

  abstract run(): Promise<any>;

  async runTask() {
    this.state = "IN_PROGRESS";
    this._log.debug(`Running task ${this._name}`);
    return this.run()
    .then(o => this.onFinished(o))
    .catch(e => this.onErrored(e));
  }

  sendEvent() {
    if (this._eventCancelled) return;

    const event: TaskEvent = {
      id: this.id,
      state: this.state,
      name: this.name,
      object: this.object
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

  onFinished(object: any) {
    this._object = object;
    this.state = "FINISHED";
  }

  onPaused() {
    this.state = "PAUSED";
  }
}
