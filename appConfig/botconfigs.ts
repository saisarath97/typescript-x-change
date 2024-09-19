// src/appConfig/botConfigs.ts
export interface BotConfig {
    symbol: string;
    source: string;
  }

import botConfigsJson from './botconfigs.json';
const botConfigs: BotConfig[] = botConfigsJson;

export default botConfigs;
  