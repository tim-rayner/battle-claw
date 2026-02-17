import {
  LogGameStatePeriodic,
  LogHeal,
  LogItemEquip,
  LogItemPickup,
  LogItemUse,
  LogPlayerAttack,
  LogPlayerKillV2,
  LogPlayerPosition,
  LogPlayerTakeDamage,
  LogVehicleLeave,
  LogVehicleRide,
  LogWeaponFireCount,
  TelemetryEvent,
} from "../../types";
import { ApiClient } from "../api-client";

export interface FilteredTelemetry {
  attacks: LogPlayerAttack[];
  fireCountEvents: LogWeaponFireCount[];
  kills: LogPlayerKillV2[];
  damageTaken: LogPlayerTakeDamage[];
  damageDealtEvents: LogPlayerTakeDamage[];
  positions: LogPlayerPosition[];
  itemPickups: LogItemPickup[];
  itemEquips: LogItemEquip[];
  heals: LogHeal[];
  itemUses: LogItemUse[];
  gameStates: LogGameStatePeriodic[];
  vehicleRides: LogVehicleRide[];
  vehicleLeaves: LogVehicleLeave[];
}

export class TelemetryService {
  constructor(private api: ApiClient) {}

  async fetchAndFilter(
    telemetryUrl: string,
    playerNames: string[],
  ): Promise<FilteredTelemetry> {
    const events = await this.api.fetchTelemetry(telemetryUrl);
    return this.filterEvents(events as TelemetryEvent[], playerNames);
  }

  private filterEvents(
    events: TelemetryEvent[],
    playerNames: string[],
  ): FilteredTelemetry {
    const nameSet = new Set(playerNames.map((n) => n.toLowerCase()));

    const result: FilteredTelemetry = {
      attacks: [],
      fireCountEvents: [],
      kills: [],
      damageTaken: [],
      damageDealtEvents: [],
      positions: [],
      itemPickups: [],
      itemEquips: [],
      heals: [],
      itemUses: [],
      gameStates: [],
      vehicleRides: [],
      vehicleLeaves: [],
    };

    for (const event of events) {
      switch (event._T) {
        case "LogPlayerAttack": {
          const e = event as LogPlayerAttack;
          if (e.attacker && nameSet.has(e.attacker.name.toLowerCase())) {
            result.attacks.push(e);
          }
          break;
        }
        case "LogWeaponFireCount": {
          const e = event as LogWeaponFireCount;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.fireCountEvents.push(e);
          }
          break;
        }
        case "LogPlayerKillV2": {
          const e = event as LogPlayerKillV2;
          const killerName = e.killer?.name?.toLowerCase();
          const victimName = e.victim?.name?.toLowerCase();
          if (
            (killerName && nameSet.has(killerName)) ||
            (victimName && nameSet.has(victimName))
          ) {
            result.kills.push(e);
          }
          break;
        }
        case "LogPlayerTakeDamage": {
          const e = event as LogPlayerTakeDamage;
          const victimName = e.victim?.name?.toLowerCase();
          const attackerName = e.attacker?.name?.toLowerCase();
          if (victimName && nameSet.has(victimName)) {
            result.damageTaken.push(e);
          }
          if (attackerName && nameSet.has(attackerName)) {
            result.damageDealtEvents.push(e);
          }
          break;
        }
        case "LogPlayerPosition": {
          const e = event as LogPlayerPosition;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.positions.push(e);
          }
          break;
        }
        case "LogItemPickup": {
          const e = event as LogItemPickup;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.itemPickups.push(e);
          }
          break;
        }
        case "LogItemEquip": {
          const e = event as LogItemEquip;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.itemEquips.push(e);
          }
          break;
        }
        case "LogHeal": {
          const e = event as LogHeal;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.heals.push(e);
          }
          break;
        }
        case "LogItemUse": {
          const e = event as LogItemUse;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.itemUses.push(e);
          }
          break;
        }
        case "LogGameStatePeriodic": {
          result.gameStates.push(event as LogGameStatePeriodic);
          break;
        }
        case "LogVehicleRide": {
          const e = event as LogVehicleRide;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.vehicleRides.push(e);
          }
          break;
        }
        case "LogVehicleLeave": {
          const e = event as LogVehicleLeave;
          if (e.character && nameSet.has(e.character.name.toLowerCase())) {
            result.vehicleLeaves.push(e);
          }
          break;
        }
      }
    }

    return result;
  }

  getEventsForPlayer(
    telemetry: FilteredTelemetry,
    playerName: string,
  ): FilteredTelemetry {
    const nameLower = playerName.toLowerCase();

    return {
      attacks: telemetry.attacks.filter(
        (e) => e.attacker?.name?.toLowerCase() === nameLower,
      ),
      fireCountEvents: telemetry.fireCountEvents.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      kills: telemetry.kills.filter(
        (e) =>
          e.killer?.name?.toLowerCase() === nameLower ||
          e.victim?.name?.toLowerCase() === nameLower,
      ),
      damageTaken: telemetry.damageTaken.filter(
        (e) => e.victim?.name?.toLowerCase() === nameLower,
      ),
      damageDealtEvents: telemetry.damageDealtEvents.filter(
        (e) => e.attacker?.name?.toLowerCase() === nameLower,
      ),
      positions: telemetry.positions.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      itemPickups: telemetry.itemPickups.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      itemEquips: telemetry.itemEquips.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      heals: telemetry.heals.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      itemUses: telemetry.itemUses.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      gameStates: telemetry.gameStates,
      vehicleRides: telemetry.vehicleRides.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
      vehicleLeaves: telemetry.vehicleLeaves.filter(
        (e) => e.character?.name?.toLowerCase() === nameLower,
      ),
    };
  }
}
