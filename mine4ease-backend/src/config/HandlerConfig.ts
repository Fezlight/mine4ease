import {$instanceService} from "../services/InstanceService";
import {$globalSettingsService} from "../services/GlobalSettingsService";
import {$minecraftService} from "../services/MinecraftService";
import {$authService} from "../services/AuthService";
import {$modService} from "../services/ModService";

export const handlerMap = new Map<string, any>();
handlerMap.set('instanceService.createInstance', (ev, args: string) => $instanceService.createInstance(JSON.parse(args)));
handlerMap.set('instanceService.selectInstance', (ev, args: string) => $instanceService.selectInstance(args));
handlerMap.set('instanceService.deleteInstance', (ev, args: string) => $instanceService.deleteInstance(args))
handlerMap.set('instanceService.getInstanceById', (ev, args: string) => $instanceService.getInstanceById(args));
handlerMap.set('instanceService.saveInstanceSettings', (ev, args: string) => $instanceService.saveInstanceSettings(JSON.parse(args)));
handlerMap.set('modService.addMod', (ev, mod: string, instance: string) => $modService.addMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('modService.deleteMod', (ev, mod: string, instance: string) => $modService.deleteMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('modService.updateMod', (ev, mod: string, instance: string) => $modService.updateMod(JSON.parse(mod), JSON.parse(instance)));
handlerMap.set('globalSettingsService.saveSettings', (ev, args: string) => $globalSettingsService.saveSettings(JSON.parse(args)));
handlerMap.set('globalSettingsService.retrieveSettings', () => $globalSettingsService.retrieveSettings());
handlerMap.set('minecraftService.launchGame', (ev, args: string) => $minecraftService.launchGame(JSON.parse(args)));
handlerMap.set('authService.authenticate', () => $authService.authenticate());
handlerMap.set('authService.getProfile', () => $authService.getProfile());

