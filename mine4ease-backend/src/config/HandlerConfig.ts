import {$authService, $instanceService, $minecraftService} from "./ObjectFactoryConfig.ts";

export const handlerMap = new Map<string, any>();
handlerMap.set('instanceService.createInstance', (ev, args) => $instanceService.createInstance(JSON.parse(args)));
handlerMap.set('instanceService.deleteInstance', (ev, args) => $instanceService.deleteInstance(args))
handlerMap.set('instanceService.getInstanceById', (ev, args) => $instanceService.getInstanceById(args));
handlerMap.set('instanceService.saveSettings', (ev, args) => $instanceService.saveSettings(JSON.parse(args)));
handlerMap.set('instanceService.saveInstanceSettings', (ev, args) => $instanceService.saveInstanceSettings(JSON.parse(args)));
handlerMap.set('instanceService.retrieveSettings', () => $instanceService.retrieveSettings());
handlerMap.set('minecraftService.launchGame', (ev, args) => $minecraftService.launchGame(JSON.parse(args)));
handlerMap.set('authService.authenticate', () => JSON.stringify($authService.authenticate()));

