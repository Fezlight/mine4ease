import {File} from "./File";
import {ApiType} from "../../services/ApiService";

export const SHADERS_PATH = "/shaderpacks"

export class Shader extends File {
    id: number;
    displayName: string;
    authors: { id: string, name: string }[];
    summary: string;
    installedFileId: number;
    installedFileDate: Date;
    description: string;
    gameVersion?: string;
    iconUrl: string;
    apiType: ApiType;

    mainPath(): string {
        return SHADERS_PATH;
    }
}
