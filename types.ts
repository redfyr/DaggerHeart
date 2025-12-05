export enum TraitType {
  Agility = "Agility",
  Strength = "Strength",
  Finesse = "Finesse",
  Instinct = "Instinct",
  Presence = "Presence",
  Knowledge = "Knowledge"
}

export interface Trait {
  name: TraitType;
  value: number;
  description: string;
}

export interface Weapon {
  id: string;
  name: string;
  type: "Physical" | "Magic";
  damage: string; // e.g., "d8+2"
  range: string;
  trait: TraitType;
  description: string;
}

export interface AbilityCard {
  id: string;
  name: string;
  domain: string;
  level: number;
  cost?: string; // e.g., "1 Hope"
  description: string;
  active: boolean;
}

export interface Experience {
  id: string;
  name: string;
  value: number; // usually +1 or +2
  description: string;
}

export interface CharacterProfile {
  id?: string; // Unique ID for database storage
  name: string;
  class: string;
  subclass: string;
  level: number;
  ancestry: string;
  community: string;
  traits: Trait[];
  evasion: number;
  armor: number; // Current armor slots filled
  maxArmor: number;
  hp: number; // Current damage points taken
  minorThreshold: number;
  majorThreshold: number;
  severeThreshold: number;
  stress: number;
  maxStress: number;
  hope: number;
  maxHope: number;
  gold: number;
  weapons: Weapon[];
  abilities: AbilityCard[];
  experiences: Experience[];
  inventory: string[];
}

export interface RollResult {
  hopeDie: number;
  fearDie: number;
  total: number;
  isCrit: boolean;
  withHope: boolean; // Hope >= Fear
  withFear: boolean; // Fear > Hope
}