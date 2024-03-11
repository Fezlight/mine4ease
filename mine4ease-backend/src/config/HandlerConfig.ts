import {$instanceService} from "../services/InstanceService";
import {$globalSettingsService} from "../services/GlobalSettingsService";
import {$minecraftService} from "../services/MinecraftService";
import {$authService} from "../services/AuthService";
import {$modService} from "../services/ModService";
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent;

export const handlerMap = new Map<string, any>();
handlerMap.set('instanceService.createInstance', (ev: IpcMainInvokeEvent, args: string) => $instanceService.createInstance(JSON.parse(args)));
handlerMap.set('instanceService.selectInstance', (ev: IpcMainInvokeEvent, args: string) => $instanceService.selectInstance(args));
handlerMap.set('instanceService.deleteInstance', (ev: IpcMainInvokeEvent, args: string) => $instanceService.deleteInstance(args))
handlerMap.set('instanceService.getInstanceById', (ev: IpcMainInvokeEvent, args: string) => $instanceService.getInstanceById(args));
handlerMap.set('instanceService.saveInstanceSettings', (ev: IpcMainInvokeEvent, args: string) => $instanceService.saveInstanceSettings(JSON.parse(args)));
handlerMap.set('instanceService.openFolder', (ev: IpcMainInvokeEvent, args: string) => $instanceService.openFolder(args));
handlerMap.set('modService.addMod', (ev: IpcMainInvokeEvent, mod: string, instance: string) => $modService.addMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('modService.deleteMod', (ev: IpcMainInvokeEvent, mod: string, instance: string) => $modService.deleteMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('modService.updateMod', (ev: IpcMainInvokeEvent, mod: string, instance: string) => $modService.updateMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('globalSettingsService.saveSettings', (ev: IpcMainInvokeEvent, args: string) => $globalSettingsService.saveSettings(JSON.parse(args)));
handlerMap.set('globalSettingsService.retrieveSettings', () => $globalSettingsService.retrieveSettings());
handlerMap.set('minecraftService.launchGame', (ev: IpcMainInvokeEvent, args: string) => $minecraftService.launchGame(JSON.parse(args)));
handlerMap.set('authService.authenticate', () => $authService.authenticate());
handlerMap.set('authService.getProfile', () => $authService.getProfile());

