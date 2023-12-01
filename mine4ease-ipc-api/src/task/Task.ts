import {Logger} from "winston";
import {v4 as uuidv4} from "uuid";
import {EventEmitter} from 'events';

export class Queue<T> {
  private readonly _items: { [key: number]: T };
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

  get length() {
    return this.tailIndex - this.headIndex;
  }
}

export interface TaskOptions {

}

export const TASK_EVENT_NAME = "task-event"
export const ADD_TASK_EVENT_NAME = "add-task-event"

export interface TaskEvent {
  id: string;
  name: string;
  state: string;
}

export type TaskState = "FINISHED" | "CREATED" | "PAUSED" | "IN_PROGRESS" | "FAILED";

export class TaskRunner {
  private queue = new Queue<Task>();
  private log: Logger;
  private isProcessing = false;

  constructor(log: Logger, eventEmitter: EventEmitter) {
    this.log = log;
    eventEmitter.on(ADD_TASK_EVENT_NAME, (task: Task, processing: boolean) => {
      this.addTask(task, processing);
    })
  }

  async process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.pop();

      await task.runTask()
      .catch(e => this.log.error(e));
    }

    this.isProcessing = false;
  }

  addTask(task: Task, processing: boolean = true) {
    this.queue.enqueue(task);
    if (processing) {
      this.process();
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
  protected readonly log: Logger;
  protected readonly eventEmitter: EventEmitter;
  private readonly eventCanceled: boolean;

  protected constructor(eventEmitter: EventEmitter, log: Logger, getName: () => string, eventCanceled: boolean = false) {
    this._id = uuidv4();
    this._name = getName();
    this.eventEmitter = eventEmitter;
    this.log = log;
    this.log.debug(this._name);
    this.eventCanceled = eventCanceled;
    this.onCreated();
  }

  abstract run(): Promise<void>;

  async runTask() {
    this.state = "IN_PROGRESS";
    return this.run()
    .then(() => this.onFinished())
    .catch(e => this.onErrored(e));
  }

  private set state(state: TaskState) {
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
    if (this.eventCanceled) return;

    const event: TaskEvent = {
      id: this.id,
      state: this.state,
      name: this.name
    };

    this.eventEmitter.emit(TASK_EVENT_NAME, event);
  }

  onCreated() {
    this.state = "CREATED";
  }

  onErrored(e: Error) {
    this.state = "FAILED";
    this.log.error("", e);
  }

  onFinished() {
    this.state = "FINISHED";
  }

  onPaused() {
    this.state = "PAUSED";
  }
}
