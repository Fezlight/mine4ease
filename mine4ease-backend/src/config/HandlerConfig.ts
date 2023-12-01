import {$authService, $globalSettingsService, $instanceService, $minecraftService} from "./ObjectFactoryConfig.ts";

export const handlerMap = new Map<string, any>();
handlerMap.set('instanceService.createInstance', (ev, args) => $instanceService.createInstance(JSON.parse(args)));
handlerMap.set('instanceService.selectInstance', (ev, args) => $instanceService.selectInstance(args));
handlerMap.set('instanceService.deleteInstance', (ev, args) => $instanceService.deleteInstance(args))
handlerMap.set('instanceService.getInstanceById', (ev, args) => $instanceService.getInstanceById(args));
handlerMap.set('instanceService.saveInstanceSettings', (ev, args) => $instanceService.saveInstanceSettings(JSON.parse(args)));
handlerMap.set('globalSettingsService.saveSettings', (ev, args) => $globalSettingsService.saveSettings(JSON.parse(args)));
handlerMap.set('globalSettingsService.retrieveSettings', () => $globalSettingsService.retrieveSettings());
handlerMap.set('minecraftService.launchGame', (ev, args) => $minecraftService.launchGame(JSON.parse(args)));
handlerMap.set('authService.authenticate', () => $authService.authenticate());
handlerMap.set('authService.getProfile', () => $authService.getProfile());

