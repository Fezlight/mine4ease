import {
    ApiType,
    getByType,
    INSTANCE_PATH,
    InstanceSettings,
    Mod,
    MODS_PATH,
    Shader,
    Task,
    TaskRunner
} from "mine4ease-ipc-api";
import {EventEmitter} from "events";
import {$eventEmitter, $utils, logger} from "../config/ObjectFactoryConfig.ts";
import {join} from "path";
import {SHADERS_PATH} from "../../../mine4ease-ipc-api";

export class InstallShaderTask extends Task {
    private readonly _instance: InstanceSettings;
    private readonly _shader: Shader;
    private readonly _subEventEmitter: EventEmitter;
    private readonly _taskRunner: TaskRunner;
    private _version: number | undefined;

    constructor(shader: Shader, instance: InstanceSettings, eventEmitter: EventEmitter = $eventEmitter,
                version?: number, eventCancelled = false) {
        super(eventEmitter, logger, () => `Installing shader ${shader.name}...`, eventCancelled);
        this._shader = shader;
        this._instance = instance;
        this._version = version;
        this._subEventEmitter = new EventEmitter();
        this._taskRunner = new TaskRunner(logger, this._subEventEmitter, this._eventEmitter, {
            eventCancelled: this._eventEmitter !== $eventEmitter
        });
    }

    async run(): Promise<Shader> {
        let shader: Shader | undefined;

        if (this._shader.filename) {
            let hash= await $utils.readFileHash(join(INSTANCE_PATH, this._instance.id, SHADERS_PATH, this._shader.filename));

            if (hash === this._shader.sha1) {
                return this._shader;
            }
        }

        let apiService = getByType(this._shader.apiType);

        if (this._shader.apiType === ApiType.CURSE) {
            let mods = await apiService.getFileById(this._version, this._shader.id, new Shader(), this._instance.versions.minecraft.name, this._instance.modLoader!);


        } else if (this._shader.apiType === ApiType.FEEDTHEBEAST) {

        } else {
            throw new Error("Not yet implemented");
        }

        return Promise.resolve(undefined);
    }
}