
import { CharacterProfile, TraitType } from './types';

export const STATIC_INFO: Record<string, { title: string; content: string }> = {
  // Traits
  [TraitType.Agility]: { 
    title: "Agility", 
    content: "Agility measures your speed, balance, and coordination.\n\nUsage:\n• Sprinting, leaping, and climbing.\n• Balancing on precarious surfaces.\n• Firing ranged weapons (Bows/Crossbows).\n• Dodging area of effect attacks." 
  },
  [TraitType.Strength]: { 
    title: "Strength", 
    content: "Strength measures your raw physical power and athleticism.\n\nUsage:\n• Lifting heavy objects or smashing doors.\n• Grappling or shoving enemies.\n• Wielding heavy melee weapons.\n• Enduring physical hardship." 
  },
  [TraitType.Finesse]: { 
    title: "Finesse", 
    content: "Finesse measures your manual dexterity and precision.\n\nUsage:\n• Picking locks and disarming traps.\n• Performing slight-of-hand.\n• Hiding and moving silently.\n• Wielding light, precise weapons." 
  },
  [TraitType.Instinct]: { 
    title: "Instinct", 
    content: "Instinct measures your intuition and situational awareness.\n\nUsage:\n• Sensing danger or hidden enemies.\n• Navigating wilderness or tracking.\n• Reading someone's true intentions.\n• Reacting quickly to surprises." 
  },
  [TraitType.Presence]: { 
    title: "Presence", 
    content: "Presence measures your charisma and force of personality.\n\nUsage:\n• Charming or persuading others.\n• Intimidating or commanding respect.\n• Performing for a crowd.\n• Casting magic related to the soul or emotion." 
  },
  [TraitType.Knowledge]: { 
    title: "Knowledge", 
    content: "Knowledge measures your intellect, logic, and education.\n\nUsage:\n• Recalling lore and history.\n• Analyzing magical effects.\n• Treating wounds and medicine.\n• Comprehending languages or codes." 
  },

  // Stats & Vitals
  "Evasion": { 
    title: "Evasion Score", 
    content: "Your Evasion Score represents your passive defense. Enemies must roll equal to or higher than this number to hit you with an attack.\n\nIt is typically calculated as:\nClass Base Value + (Agility, Strength, or Finesse)." 
  },
  "Damage": { 
    title: "Health & Damage Thresholds", 
    content: "Daggerheart uses Damage Thresholds rather than subtracting HP directly.\n\nWhen you take damage:\n1. Compare the damage amount to your Thresholds.\n2. **< Minor**: Mark Stress (or 1 HP if Stress is full).\n3. **Minor - Major**: Mark 1 HP.\n4. **Major - Severe**: Mark 2 HP.\n5. **≥ Severe**: Mark 3 HP.\n\nIf you mark your last HP box, you make a Death Move." 
  },
  "Armor": { 
    title: "Armor Slots", 
    content: "Armor protects you from physical harm.\n\n• **Armor Score**: How much damage your armor absorbs (e.g., 5).\n• **Armor Slots**: How many times you can use your armor.\n\nReaction: When you take damage, you can spend 1 Armor Slot to reduce the incoming damage total by your Armor Score." 
  },
  "Stress": { 
    title: "Stress", 
    content: "Stress represents fatigue, mental strain, or minor scrapes.\n\nUsage:\n• **Pay Cost**: Many abilities require spending Stress.\n• **Push Yourself**: Mark Stress to help an ally (+1d6 to them).\n• **Absorb Damage**: Damage below your Minor Threshold marks Stress instead of HP.\n\nIf your Stress is full and you must take more, you mark 1 HP instead." 
  },
  "Hope": { 
    title: "Hope", 
    content: "Hope is a resource representing momentum, luck, and resolve.\n\nGaining Hope:\n• Roll with Hope (Hope Die ≥ Fear Die).\n\nSpending Hope:\n• **Use Ability**: Pay the Hope cost of a card.\n• **Help Ally**: Spend 1 Hope to give an ally +1d12 to their roll.\n• **Advantage**: Spend 1 Hope to give yourself Advantage (+1d6) on a roll." 
  },
  "Gold": { 
    title: "Gold & Wealth", 
    content: "Wealth in Daggerheart can be tracked loosely or specifically.\n\n• **Handful**: Small change, a meal, a drink.\n• **Bag**: A weapon, a night at a good inn, a bribe.\n• **Chest**: A horse, a cart, a masterwork item.\n\nPlayers usually start with a few gold pieces or a 'Bag' worth of funds." 
  },

  // Sections
  "Class Features": { 
    title: "Class & Subclass", 
    content: "Your **Class** defines your core role (e.g., Warrior, Wizard) and sets your Damage Thresholds and Trait selections.\n\nYour **Subclass** (selected at Level 1) grants you a specific Foundation Card and unique abilities that define your playstyle (e.g., a 'Slayer' Warrior vs a 'Knight' Warrior)." 
  },
  "Weapons": { 
    title: "Weapons Rules", 
    content: "**Trait**: The stat you add to the attack roll (e.g., Strength).\n**Range**:\n• Melee: Touch/Reach.\n• Close: Within a few paces/thrown.\n• Far: Line of sight/bowshot.\n**Type**:\n• Physical: Blocked by Armor.\n• Magic: Often ignores Armor or requires specific resistance." 
  },
  "Abilities": { 
    title: "Abilities Rules", 
    content: "Abilities come from your Class, Subclass, and Domain Cards.\n\n**Active**: Requires an action token to use in combat.\n**Passive**: Always in effect.\n**Recall**: Some cards can be 'recalled' to your hand, removing them from play to regain resources or cooldowns." 
  },
  "Experiences": { 
    title: "Experiences", 
    content: "Experiences are narrative tags describing your background (e.g., 'Ex-Soldier', 'Raised by Wolves').\n\nMechanic: When making a roll where an Experience is relevant, you can spend **1 Hope** to add the Experience value (usually +2) to your roll." 
  },
  "Inventory": { 
    title: "Inventory", 
    content: "Your equipment list. Daggerheart inventory is generally narrative-first.\n\n• You can carry a reasonable amount of gear.\n• Potions and consumables should be tracked carefully.\n• Weapons and Armor usually have their own dedicated slots." 
  }
};

export const COMMON_ITEMS = {
  "Consumables": [
    "Healing Potion (Minor)", "Healing Potion (Major)", "Antidote", "Rations (1 day)", "Bandages", "Stress Potion"
  ],
  "Light & Camping": [
    "Torch", "Lantern", "Oil Flask", "Bedroll", "Flint and Steel", "Tent (Small)", "Waterskin"
  ],
  "Tools": [
    "Rope (50ft)", "Crowbar", "Grappling Hook", "Lockpicks", "Compass", "Shovel", "Whistle"
  ],
  "Valuables": [
    "Bag of Gold", "Handful of Gold", "Gemstone", "Strange Relic"
  ]
};

export const EXAMPLE_EXPERIENCES = {
  "Background": [
    "Street Urchin", "Noble Scion", "Hermit", "Soldier", "Scholar", "Criminal", "Entertainer", "Sailor"
  ],
  "Training": [
    "Master Swordsman", "Arcane Scholar", "Stealth Expert", "Survivalist", "Medic", "Diplomat"
  ],
  "Quirks & History": [
    "Raised by Wolves", "Cursed by a Witch", "Sole Survivor", "Dragon Slayer", "Wanted Fugitive", "Haunted"
  ]
};

export const DAGGERHEART_RULES = {
  classes: [
    { name: "Bard", subclasses: ["Wordsmith", "Troubadour"] },
    { name: "Druid", subclasses: ["Warden of the Elements", "Warden of the Wilds"] },
    { name: "Guardian", subclasses: ["Stalwart", "Vengeance"] },
    { name: "Ranger", subclasses: ["Wayfinder", "Beastbound"] },
    { name: "Rogue", subclasses: ["Syndicate", "Nightwalker"] },
    { name: "Seraph", subclasses: ["Divine Wielder", "Winged Sentinel"] },
    { name: "Sorcerer", subclasses: ["Elemental Origin", "Primal Origin"] },
    { name: "Warrior", subclasses: ["Slayer", "Knight"] },
    { name: "Wizard", subclasses: ["School of War", "School of Knowledge"] }
  ],
  ancestries: [
    "Clank", "Dwarf", "Elf", "Faerie", "Fungril", "Galapa", "Giant", 
    "Goblin", "Halfling", "Human", "Katari", "Orc", "Ribbet", "Simiah"
  ],
  communities: [
    "Highborne", "Loreborne", "Orderborne", "Ridgeborne", "Seaborne", 
    "Slyborne", "Underborne", "Wanderborne", "Wildborne"
  ],
  domains: [
    "Arcana", "Blade", "Bone", "Codex", "Grace", "Midnight", "Sage", "Splendor", "Valor"
  ],
  standardWeapons: [
    { name: "Greatsword", damage: "d10+2", trait: "Strength", type: "Physical", range: "Melee", desc: "Heavy two-handed blade." },
    { name: "Battleaxe", damage: "d10+2", trait: "Strength", type: "Physical", range: "Melee", desc: "Devastating swings." },
    { name: "Longsword", damage: "d8", trait: "Strength", type: "Physical", range: "Melee", desc: "Versatile and reliable." },
    { name: "Shortsword", damage: "d8", trait: "Agility", type: "Physical", range: "Melee", desc: "Quick strikes." },
    { name: "Dagger", damage: "d6", trait: "Finesse", type: "Physical", range: "Close", desc: "Precision work." },
    { name: "Rapier", damage: "d8", trait: "Finesse", type: "Physical", range: "Melee", desc: "Elegant thrusts." },
    { name: "Longbow", damage: "d8", trait: "Agility", type: "Physical", range: "Far", desc: "Ranged dominance." },
    { name: "Crossbow", damage: "d10", trait: "Agility", type: "Physical", range: "Far", desc: "Heavy projectile." },
    { name: "Staff", damage: "d6", trait: "Knowledge", type: "Magic", range: "Melee", desc: "Arcane focus." },
    { name: "Wand", damage: "d8", trait: "Presence", type: "Magic", range: "Far", desc: "Blast of magic." },
    { name: "Scepter", damage: "d8", trait: "Instinct", type: "Magic", range: "Melee", desc: "Channeling power." }
  ]
};

export const INITIAL_CHARACTER: CharacterProfile = {
  name: "Kaelen Thorne",
  class: "Warrior",
  subclass: "Slayer",
  level: 2,
  ancestry: "Human",
  community: "Highborne",
  traits: [
    { name: TraitType.Agility, value: 1, description: "Sprint, Leap, Maneuver" },
    { name: TraitType.Strength, value: 2, description: "Lift, Smash, Grapple" },
    { name: TraitType.Finesse, value: 0, description: "Notice, Aim, Hide" },
    { name: TraitType.Instinct, value: 0, description: "Sense, React, Navigate" },
    { name: TraitType.Presence, value: -1, description: "Charm, Perform, Command" },
    { name: TraitType.Knowledge, value: 1, description: "Recall, Analyze, Heal" },
  ],
  evasion: 8,
  armor: 1,
  maxArmor: 3,
  hp: 0, // 0 damage taken
  minorThreshold: 5,
  majorThreshold: 10,
  severeThreshold: 15,
  stress: 2,
  maxStress: 6,
  hope: 2,
  maxHope: 5,
  gold: 15,
  weapons: [
    {
      id: "w1",
      name: "Greatsword",
      type: "Physical",
      damage: "d10+2",
      range: "Melee",
      trait: TraitType.Strength,
      description: "A massive blade of folded steel. Deals heavy damage but requires two hands."
    },
    {
      id: "w2",
      name: "Throwing Daggers",
      type: "Physical",
      damage: "d6",
      range: "Far",
      trait: TraitType.Agility,
      description: "Balanced blades hidden in a belt sash."
    }
  ],
  abilities: [
    {
      id: "a1",
      name: "Battlefield Commander",
      domain: "Blade",
      level: 1,
      cost: "1 Hope",
      description: "Mark an enemy. Allies gain advantage when attacking that enemy until the start of your next turn.",
      active: true
    },
    {
      id: "a2",
      name: "Whirlwind",
      domain: "Bone",
      level: 2,
      cost: "2 Stress",
      description: "Attack all enemies within melee range. Mark 1 stress for each enemy targeted beyond the first.",
      active: true
    }
  ],
  experiences: [
    {
      id: "e1",
      name: "Veteran of the Ashen War",
      value: 2,
      description: "You served on the front lines against the shadow beasts."
    },
    {
      id: "e2",
      name: "Noble Etiquette",
      value: 1,
      description: "You know how to speak to those in power."
    }
  ],
  inventory: [
    "Healing Potion (Minor)",
    "Rope (50ft)",
    "Torch x3",
    "Travel Rations"
  ]
};
