
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_CHARACTER, BLANK_CHARACTER, DAGGERHEART_RULES, STATIC_INFO, COMMON_ITEMS, EXAMPLE_EXPERIENCES, CLASS_DOMAINS, SAMPLE_ABILITIES, WEAPON_RANGES } from './constants';
import { CharacterProfile, TraitType, RollResult, Weapon, AbilityCard, Experience } from './types';
import { getRulesInsight, getNarrativeFlavor, subscribeToUsage } from './services/geminiService';
import { saveCharacterToDB, getAllCharacters, deleteCharacterFromDB } from './services/db';

// --- Constants ---
const MAX_HP = 6; // Daggerheart standard HP slots

// --- Icons (SVG) ---
const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block opacity-50 hover:opacity-100 transition-opacity cursor-help"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);

const EditIcon = () => ( // Pencil Icon
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

const FolderIcon = () => ( // Folder Icon for Load
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const FilePlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const SwordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg>
);

// --- Helpers for Avatars ---
const getAncestryPrompt = (ancestry: string) => {
    const map: Record<string, string> = {
      "Clank": "steampunk robot construct character portrait",
      "Fungril": "mushroom person humanoid fantasy character portrait",
      "Galapa": "turtle humanoid warrior fantasy character portrait",
      "Ribbet": "frog humanoid fantasy character portrait",
      "Simiah": "monkey humanoid fantasy character portrait",
      "Katari": "cat humanoid fantasy character portrait",
      "Dwarf": "dwarf fantasy character portrait",
      "Elf": "elf fantasy character portrait",
      "Faerie": "fairy fantasy character portrait",
      "Giant": "giant fantasy character portrait",
      "Goblin": "goblin fantasy character portrait",
      "Halfling": "halfling fantasy character portrait",
      "Human": "human warrior fantasy character portrait",
      "Orc": "orc fantasy character portrait",
      "Drakona": "dragonborn humanoid fantasy character portrait"
    };
    return map[ancestry] || `${ancestry} fantasy character portrait`;
};
  
const getAvatarUrl = (ancestry: string) => {
    const prompt = encodeURIComponent(getAncestryPrompt(ancestry) + " high quality art station style");
    return `https://image.pollinations.ai/prompt/${prompt}?width=250&height=250&nologo=true`;
};

// --- Helper: Robust ID Generator ---
const generateSimpleId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- Smart Avatar Component ---
function SmartAvatar({ ancestry, className }: { ancestry: string, className?: string }) {
    const url = getAvatarUrl(ancestry);
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
    
    // If the url prop is different from the loadedUrl, we are loading
    const isLoading = url !== loadedUrl;

    return (
         <div className={`relative shrink-0 ${className} overflow-hidden bg-slate-800`}>
            <img 
                key={url} // Reset DOM node on url change
                src={url} 
                alt={ancestry}
                className="w-full h-full object-cover"
                onLoad={() => setLoadedUrl(url)} // Mark this specific URL as loaded
                onError={() => setLoadedUrl(url)} // Stop loading on error
            />
            {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-[2px] z-10 animate-in fade-in duration-300">
                    <div className="animate-spin rounded-full h-1/3 w-1/3 border-2 border-t-transparent border-dagger-gold opacity-90"></div>
                </div>
            )}
         </div>
    )
}

// --- Markdown Text Renderer ---
// Handles bold text (**text**) and bullet lists (lines starting with •)
const MarkdownText = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split('\n');
  
  return (
    <div className="text-slate-300 text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />; // Spacer for empty lines
        
        const isBullet = line.trim().startsWith('•');
        const textToProcess = isBullet ? line.trim().substring(1) : line;
        
        const parts = textToProcess.split(/(\*\*.*?\*\*)/g);
        const children = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-dagger-gold font-bold">{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="text-dagger-gold/70 mt-1.5 text-[10px]">•</span>
              <span className="flex-1">{children}</span>
            </div>
          );
        }

        return <div key={i}>{children}</div>;
      })}
    </div>
  );
};

// --- Draggable Value Component for Gold ---
function DraggableValue({ 
    value, 
    onChange, 
    label 
}: { 
    value: number, 
    onChange: (val: number) => void, 
    label: string 
}) {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startVal = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startVal.current = value;
        document.body.style.cursor = 'ns-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const delta = startY.current - e.clientY;
        const steps = Math.floor(delta / 10); // 10px per step
        const newVal = Math.max(0, startVal.current + steps);
        onChange(newVal);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="flex flex-col items-center">
            <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">{label}</label>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button onClick={() => onChange(Math.max(0, value - 1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                    -
                </button>
                <div 
                    className="w-12 text-center font-bold text-xl text-dagger-gold cursor-ns-resize select-none"
                    onMouseDown={handleMouseDown}
                >
                    {value}
                </div>
                <button onClick={() => onChange(value + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded">
                    +
                </button>
            </div>
        </div>
    );
}


export default function App() {
  const [character, setCharacter] = useState<CharacterProfile>(INITIAL_CHARACTER);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [showRollDetail, setShowRollDetail] = useState(false);
  const [flavorText, setFlavorText] = useState<string>("");
  const [loadingFlavor, setLoadingFlavor] = useState(false);
  
  // Modals state
  const [activeModal, setActiveModal] = useState<'NONE' | 'PROFILE' | 'WEAPON' | 'ABILITY' | 'CHAR_SELECT' | 'INFO_MODAL' | 'EXPERIENCE' | 'INVENTORY' | 'GOLD'>('NONE');
  const [infoModalData, setInfoModalData] = useState({ topic: '', content: '', loading: false });
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  } | null>(null);

  // Usage Stats
  const [usageStats, setUsageStats] = useState({ calls: 0, tokens: 0 });

  // Auto-Save State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const unsubscribe = subscribeToUsage((stats) => {
      setUsageStats(stats);
    });
    return () => unsubscribe();
  }, []);

  // --- Auto-Save Effect ---
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const id = await saveCharacterToDB(character);
        setSaveStatus('saved');
        
        // Critical: Update state ID if it was missing to prevent duplicate records on subsequent saves
        // checking if character.id is different to avoid infinite loops if it was just assigned
        if (!character.id) {
            setCharacter(prev => ({ ...prev, id }));
        }
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('idle'); // or error indicator
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [character]);

  // --- Handlers ---

  const handleRoll = async (traitName: string, modifier: number) => {
    const hopeDie = Math.floor(Math.random() * 12) + 1;
    const fearDie = Math.floor(Math.random() * 12) + 1;
    const total = hopeDie + fearDie + modifier;
    const isCrit = hopeDie === fearDie;
    const withHope = hopeDie >= fearDie;
    
    const result: RollResult = {
      hopeDie,
      fearDie,
      total,
      isCrit,
      withHope,
      withFear: !withHope
    };

    setRollResult(result);
    setShowRollDetail(true); // Automatically open the roll detail
    
    setLoadingFlavor(true);
    const actionDesc = `making a ${traitName} roll`;
    const outcome = isCrit ? "Critical Success" : (withHope ? "Success with Hope" : "Success with Fear");
    const flavor = await getNarrativeFlavor(character.name, actionDesc, `${outcome} (Total ${total})`);
    setFlavorText(flavor);
    setLoadingFlavor(false);
  };

  const handleAskAI = async (topic: string, context: string) => {
    setInfoModalData({ topic, content: '', loading: true });
    setActiveModal('INFO_MODAL');
    const answer = await getRulesInsight(topic, context);
    setInfoModalData({ topic, content: answer, loading: false });
  };

  const handleStaticInfo = (key: string) => {
    const info = STATIC_INFO[key];
    if (info) {
        setInfoModalData({ topic: info.title, content: info.content, loading: false });
        setActiveModal('INFO_MODAL');
    }
  };

  const loadCharacters = async () => {
    const chars = await getAllCharacters();
    setSavedCharacters(chars);
    setActiveModal('CHAR_SELECT');
  };

  const handleNewCharacter = () => {
      // Create a fresh character by copying the blank template.
      // Important: Ensure ID is undefined so the auto-save creates a new DB entry.
      setCharacter({ ...BLANK_CHARACTER });
      setActiveModal('NONE');
  };

  // --- Editing Handlers ---

  const handleUpdateProfile = (formData: Partial<CharacterProfile>) => {
    setCharacter(prev => ({ ...prev, ...formData }));
    setActiveModal('NONE');
  };

  const handleAddWeapon = (weapon: Weapon) => {
    setCharacter(prev => ({ ...prev, weapons: [...prev.weapons, weapon] }));
    setActiveModal('NONE');
  };

  const handleAddAbility = (ability: AbilityCard) => {
    setCharacter(prev => ({ ...prev, abilities: [...prev.abilities, ability] }));
    setActiveModal('NONE');
  };

  const handleAddExperience = (exp: Experience) => {
    setCharacter(prev => ({ ...prev, experiences: [...prev.experiences, exp] }));
    setActiveModal('NONE');
  };

  const handleAddInventory = (item: string) => {
    if (item) {
        setCharacter(prev => ({ ...prev, inventory: [...prev.inventory, item] }));
    }
    setActiveModal('NONE');
  };

  const handleUpdateGold = (newGold: number) => {
      setCharacter(prev => ({ ...prev, gold: newGold }));
  };

  // --- Deletion Request Handlers (Popups) ---

  const requestDeleteWeapon = (id: string) => {
    setDeleteModal({
        isOpen: true,
        title: "Delete Weapon",
        message: "Are you sure you want to remove this weapon? This action cannot be undone.",
        onConfirm: () => {
            setCharacter(prev => ({ ...prev, weapons: prev.weapons.filter(w => w.id !== id) }));
            setDeleteModal(null);
        }
    });
  };

  const requestDeleteAbility = (id: string) => {
    setDeleteModal({
        isOpen: true,
        title: "Delete Ability",
        message: "Are you sure you want to remove this ability? This action cannot be undone.",
        onConfirm: () => {
            setCharacter(prev => ({ ...prev, abilities: prev.abilities.filter(a => a.id !== id) }));
            setDeleteModal(null);
        }
    });
  };

  const requestDeleteExperience = (index: number) => {
    setDeleteModal({
        isOpen: true,
        title: "Forget Experience",
        message: "Are you sure you want to remove this experience tag?",
        onConfirm: () => {
            setCharacter(prev => ({
                ...prev,
                experiences: prev.experiences.filter((_, i) => i !== index)
            }));
            setDeleteModal(null);
        }
    });
  };

  const requestDeleteInventory = (index: number) => {
      setDeleteModal({
        isOpen: true,
        title: "Remove Item",
        message: "Are you sure you want to remove this item from your inventory?",
        onConfirm: () => {
             setCharacter(prev => ({ ...prev, inventory: prev.inventory.filter((_, i) => i !== index) }));
             setDeleteModal(null);
        }
      });
  };

  const requestDeleteSavedChar = (id: string) => {
      setDeleteModal({
          isOpen: true,
          title: "Delete Character",
          message: "Are you sure you want to permanently delete this saved character? This cannot be undone.",
          onConfirm: async () => {
            await deleteCharacterFromDB(id);
            const chars = await getAllCharacters();
            setSavedCharacters(chars);
            setDeleteModal(null);
          }
      });
  };

  // --- Helpers ---
  const getResultColor = (res: RollResult) => {
    if (res.isCrit) return 'text-dagger-gold border-dagger-gold';
    if (res.withHope) return 'text-dagger-hope border-dagger-hope';
    return 'text-dagger-fear border-dagger-fear';
  };

  const getResultBg = (res: RollResult) => {
    if (res.isCrit) return 'bg-yellow-500/20';
    if (res.withHope) return 'bg-cyan-500/20';
    return 'bg-purple-500/20';
  };

  return (
    <div className="min-h-screen bg-dagger-dark text-slate-200 p-4 md:p-8 font-sans relative selection:bg-dagger-fear selection:text-white pb-24">
      
      {/* --- HEADER --- */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-4">
        <div className="flex items-center gap-4">
            <SmartAvatar 
                ancestry={character.ancestry}
                className="w-20 h-20 rounded-full border-2 border-dagger-gold shadow-lg"
            />
            <div>
            <h1 className="text-3xl font-serif font-bold text-white tracking-wide">{character.name}</h1>
            <p className="text-slate-400 flex items-center gap-2 flex-wrap">
                Level {character.level} {character.ancestry} {character.class} 
                <span className="text-slate-600">•</span> 
                <span className="text-dagger-gold">{character.subclass}</span>
                <button onClick={() => handleStaticInfo("Class Features")} className="ml-2 hover:text-white transition-colors">
                  <InfoIcon />
                </button>
            </p>
            </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={handleNewCharacter} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all">
            <FilePlusIcon /> <span className="hidden sm:inline">New</span>
          </button>

          <button onClick={loadCharacters} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all">
            <FolderIcon /> <span className="hidden sm:inline">Load</span>
          </button>
          
          <button onClick={() => setActiveModal('PROFILE')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-500 transition-all text-white">
            <EditIcon /> <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: TRAITS (3 cols) */}
        <div className="md:col-span-3 space-y-4">
          <div className="glass-panel rounded-xl p-4">
            <h2 className="text-xl font-serif font-bold mb-4 text-slate-300 border-b border-slate-700 pb-2">Traits</h2>
            <div className="space-y-3">
              {character.traits.map((trait) => (
                <div key={trait.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleStaticInfo(trait.name)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <InfoIcon />
                    </button>
                    <span className="font-semibold text-slate-300 w-24">{trait.name}</span>
                  </div>
                  <button 
                    onClick={() => handleRoll(trait.name, trait.value)}
                    className="w-12 h-10 flex items-center justify-center bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 hover:border-dagger-hope transition-all text-lg font-bold"
                  >
                    {trait.value >= 0 ? `+${trait.value}` : trait.value}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 italic text-center">Click a value to make a check.</p>
          </div>

          <div className="glass-panel rounded-xl p-4">
             <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-serif font-bold text-slate-300">Evasion</h2>
                <button onClick={() => handleStaticInfo("Evasion")} className="text-slate-500 hover:text-slate-300"><InfoIcon /></button>
            </div>
            <div className="flex items-center justify-center h-16 bg-slate-900/50 rounded-lg border border-slate-700">
              <span className="text-3xl font-bold text-white">{character.evasion}</span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: VITALS & COMBAT (6 cols) */}
        <div className="md:col-span-6 space-y-6">
          
          {/* Vitals Row - Redesigned Grid */}
          <div className="grid grid-cols-2 gap-4">
             {/* Damage - Top Left */}
            <div className="glass-panel rounded-xl p-3 text-center relative overflow-hidden flex flex-col items-center h-44">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
              
              {/* Header */}
              <div className="flex justify-center items-center gap-1 mb-1 mt-1">
                 <h3 className="text-sm uppercase tracking-wider text-slate-400">Damage</h3>
                 <button onClick={() => handleStaticInfo("Damage")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
              </div>

              {/* Thresholds Display */}
              <div className="flex gap-2 justify-center w-full mb-1">
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Min</span>
                    <span className="text-xs text-slate-300 leading-none">{character.minorThreshold}</span>
                 </div>
                 <div className="w-px bg-slate-700 h-6"></div>
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Maj</span>
                    <span className="text-xs text-slate-300 leading-none">{character.majorThreshold}</span>
                 </div>
                 <div className="w-px bg-slate-700 h-6"></div>
                 <div className="flex flex-col items-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Sev</span>
                    <span className="text-xs text-slate-300 leading-none">{character.severeThreshold}</span>
                 </div>
              </div>
              
              {/* Main Number */}
              <div className="flex-grow flex items-center justify-center">
                <div className="text-4xl font-bold text-white drop-shadow-md">{character.hp}</div>
              </div>
              
              {/* Interactive Circles */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-1 mt-auto">
                  {Array.from({length: MAX_HP}).map((_, i) => (
                    <button 
                        key={i}
                        onClick={() => setCharacter(c => ({...c, hp: i + 1 === c.hp ? i : i + 1}))}
                        className={`w-5 h-5 rounded-full border border-red-500 transition-all ${
                            i < character.hp ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-transparent opacity-30'
                        }`}
                    />
                  ))}
              </div>
            </div>

            {/* Armor - Top Right */}
            <div className="glass-panel rounded-xl p-3 text-center relative overflow-hidden flex flex-col items-center h-44">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-400/50"></div>
              
              {/* Header */}
              <div className="flex justify-center items-center gap-1 mb-1 mt-1">
                 <h3 className="text-sm uppercase tracking-wider text-slate-400">Armor</h3>
                 <button onClick={() => handleStaticInfo("Armor")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
              </div>

               {/* Spacer to match Damage Thresholds height */}
               <div className="h-[26px] mb-1"></div>
              
              {/* Main Number */}
              <div className="flex-grow flex items-center justify-center">
                 <div className="text-4xl font-bold text-white drop-shadow-md">{character.armor}</div>
              </div>

              {/* Interactive Circles */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-1 mt-auto">
                  {Array.from({length: character.maxArmor}).map((_, i) => (
                    <button 
                        key={i}
                        onClick={() => setCharacter(c => ({...c, armor: i + 1 === c.armor ? i : i + 1}))}
                        className={`w-5 h-5 rounded-full border border-slate-400 transition-all ${
                            i < character.armor ? 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]' : 'bg-transparent opacity-30'
                        }`}
                    />
                  ))}
              </div>
            </div>

            {/* Stress - Full Width Horizontal */}
            <div className="col-span-2 glass-panel rounded-xl p-3 flex items-center justify-between px-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm uppercase tracking-wider text-slate-400">Stress</h3>
                    <button onClick={() => handleStaticInfo("Stress")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                </div>
                <div className="flex gap-2">
                    {Array.from({length: character.maxStress}).map((_, i) => (
                        <button 
                            key={i}
                            onClick={() => setCharacter(c => ({...c, stress: i + 1 === c.stress ? i : i + 1}))}
                            className={`w-6 h-6 rounded-full border border-purple-500 transition-all ${
                                i < character.stress ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-transparent opacity-30'
                            }`}
                        />
                    ))}
                </div>
                <span className="text-xl font-bold text-purple-500">{character.stress}</span>
            </div>
            
             {/* Hope - Full Width Horizontal */}
             <div className="col-span-2 glass-panel rounded-xl p-3 flex items-center justify-between px-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-dagger-hope"></div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm uppercase tracking-wider text-slate-400">Hope</h3>
                    <button onClick={() => handleStaticInfo("Hope")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                </div>
                <div className="flex gap-2">
                    {Array.from({length: character.maxHope}).map((_, i) => (
                        <button 
                            key={i}
                            onClick={() => setCharacter(c => ({...c, hope: i + 1 === c.hope ? i : i + 1}))}
                            className={`w-6 h-6 rounded-full border border-dagger-hope transition-all ${
                                i < character.hope ? 'bg-dagger-hope shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'bg-transparent opacity-30'
                            }`}
                        />
                    ))}
                </div>
                <span className="text-xl font-bold text-dagger-hope">{character.hope}</span>
            </div>
          </div>

          {/* Weapons */}
          <div className="glass-panel rounded-xl p-4">
             <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                <div className="flex items-center gap-2">
                     <h2 className="text-xl font-serif font-bold text-slate-300">Weapons</h2>
                     <button onClick={() => handleStaticInfo("Weapons")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                </div>
                <button onClick={() => setActiveModal('WEAPON')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><PlusIcon /></button>
             </div>
             <div className="space-y-3">
                {character.weapons.map((w) => (
                    <div key={w.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center group">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-slate-500"><SwordIcon /></div>
                            <div>
                                <h4 className="font-bold text-slate-200">{w.name}</h4>
                                <p className="text-xs text-slate-400">{w.type} • {w.range} • {w.damage}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleAskAI(`Weapon: ${w.name}`, w.description)}
                                className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400 hover:text-white border border-slate-700"
                            >
                                Ask AI
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); requestDeleteWeapon(w.id); }}
                                className="text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>

          {/* Abilities */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                 <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-slate-300">Abilities</h2>
                    <button onClick={() => handleStaticInfo("Abilities")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                 </div>
                <button onClick={() => setActiveModal('ABILITY')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><PlusIcon /></button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {character.abilities.map(a => (
                    <div key={a.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                             <button onClick={(e) => { e.stopPropagation(); requestDeleteAbility(a.id); }} className="text-slate-500 hover:text-red-400"><TrashIcon /></button>
                        </div>
                        <div className="cursor-pointer" onClick={() => handleAskAI(`Ability: ${a.name}`, a.description)}>
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-dagger-gold uppercase tracking-wider">{a.domain}</span>
                                <span className="text-xs text-slate-500 mr-4">{a.cost}</span>
                            </div>
                            <h4 className="font-bold text-slate-200 mb-1">{a.name}</h4>
                            <p className="text-xs text-slate-400 line-clamp-2">{a.description}</p>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INVENTORY & NOTES (3 cols) */}
        <div className="md:col-span-3 space-y-4">
           {/* Experiences */}
           <div className="glass-panel rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                    <h2 className="text-lg font-serif font-bold text-slate-300">Experiences</h2>
                    <button onClick={() => handleStaticInfo("Experiences")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                 </div>
                <button onClick={() => setActiveModal('EXPERIENCE')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><PlusIcon /></button>
            </div>
            <div className="space-y-2">
                {character.experiences.map((e, i) => (
                    <div key={e.id || i} className="flex justify-between items-center p-2 bg-slate-900/30 rounded border border-slate-700/50 group">
                        <span className="text-sm text-slate-300">{e.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-dagger-hope">+{e.value}</span>
                            <button onClick={(ev) => { ev.stopPropagation(); requestDeleteExperience(i); }} className="text-slate-600 hover:text-red-400 p-2"><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
           </div>

           {/* Inventory */}
           <div className="glass-panel rounded-xl p-4 min-h-[200px]">
            <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                    <h2 className="text-lg font-serif font-bold text-slate-300">Inventory</h2>
                    <button onClick={() => handleStaticInfo("Inventory")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                 </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setActiveModal('GOLD')} className="text-xs text-dagger-gold border border-dagger-gold/30 px-1 rounded hover:bg-dagger-gold/10 cursor-help">{character.gold}g</button>
                    <button onClick={() => setActiveModal('INVENTORY')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><PlusIcon /></button>
                </div>
            </div>
            <ul className="space-y-2">
                {character.inventory.map((item, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            {item}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); requestDeleteInventory(i); }} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                    </li>
                ))}
            </ul>
           </div>
        </div>
      </main>

      {/* --- FLOATING STATUS INDICATORS --- */}
      
      {/* Save Status (Bottom Left, above API Stats) */}
      <div className={`fixed bottom-14 left-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur transition-all pointer-events-none ${saveStatus === 'saved' ? 'bg-slate-900/80 border-green-900/50 text-green-500' : 'bg-slate-800/80 border-slate-700 text-slate-400'}`}>
        {saveStatus === 'saving' ? (
            <>
                <div className="w-4 h-4 border-2 border-t-transparent border-slate-400 rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Saving...</span>
            </>
        ) : (
            <>
                <CheckIcon />
                <span className="text-xs font-semibold">Saved</span>
            </>
        )}
      </div>

      {/* API Stats (Bottom Left) */}
      <div className="fixed bottom-4 left-4 z-40 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full px-4 py-2 text-xs text-slate-400 shadow-lg pointer-events-none">
        <span className="font-mono font-semibold text-dagger-hope">{usageStats.calls}</span> API Calls
        <span className="mx-2 opacity-50">|</span>
        <span className="font-mono font-semibold text-dagger-fear">~{usageStats.tokens}</span> Tokens Used
      </div>

      {/* --- FLOATING DICE ORB --- */}
      {rollResult && (
        <>
          {showRollDetail && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setShowRollDetail(false)}
            >
              <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()} 
              >
                <div className={`absolute inset-0 opacity-10 ${getResultBg(rollResult)}`}></div>
                
                <div className="relative z-10 text-center">
                  <h3 className={`text-2xl font-serif font-bold mb-1 ${getResultColor(rollResult)}`}>
                    {rollResult.isCrit ? "CRITICAL SUCCESS" : (rollResult.withHope ? "SUCCESS WITH HOPE" : "SUCCESS WITH FEAR")}
                  </h3>
                  <div className="text-6xl font-bold text-white my-6 drop-shadow-lg tracking-tighter">
                    {rollResult.total}
                  </div>
                  
                  <div className="flex justify-center gap-8 mb-6">
                    <div className="text-center">
                        <div className="text-xs uppercase tracking-wider text-dagger-hope mb-1">Hope Die</div>
                        <div className={`text-3xl font-bold ${rollResult.withHope ? 'text-dagger-hope' : 'text-slate-500'}`}>{rollResult.hopeDie}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xs uppercase tracking-wider text-dagger-fear mb-1">Fear Die</div>
                        <div className={`text-3xl font-bold ${!rollResult.withHope ? 'text-dagger-fear' : 'text-slate-500'}`}>{rollResult.fearDie}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 p-3 rounded-lg min-h-[60px] flex items-center justify-center">
                    {loadingFlavor ? (
                        <span className="text-slate-500 text-sm animate-pulse">Consulting the spirits...</span>
                    ) : (
                        <p className="text-sm text-slate-300 italic">"{flavorText}"</p>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-4">Tap outside to close</p>
                </div>
              </div>
            </div>
          )}

          {!showRollDetail && (
            <button
              onClick={() => setShowRollDetail(true)}
              className={`fixed bottom-6 right-6 w-16 h-16 rounded-full glass-panel shadow-2xl border-2 flex items-center justify-center z-40 transition-transform hover:scale-110 active:scale-95 ${getResultColor(rollResult)}`}
            >
              <span className="text-2xl font-bold">{rollResult.total}</span>
              <span className={`absolute -top-1 -right-1 flex h-4 w-4`}>
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${rollResult.withHope ? 'bg-dagger-hope' : 'bg-dagger-fear'}`}></span>
                 <span className={`relative inline-flex rounded-full h-4 w-4 ${rollResult.withHope ? 'bg-dagger-hope' : 'bg-dagger-fear'}`}></span>
              </span>
            </button>
          )}
        </>
      )}


      {/* --- MODALS --- */}
      
      {/* 1. Edit Profile Modal */}
      {activeModal === 'PROFILE' && (
        <EditCharacterModal 
            character={character} 
            onSave={handleUpdateProfile} 
            onClose={() => setActiveModal('NONE')} 
        />
      )}

      {/* 2. Add Weapon Modal */}
      {activeModal === 'WEAPON' && (
        <AddWeaponModal 
            onSave={handleAddWeapon}
            onClose={() => setActiveModal('NONE')}
        />
      )}

      {/* 3. Add Ability Modal */}
      {activeModal === 'ABILITY' && (
        <AddAbilityModal
            onSave={handleAddAbility}
            onClose={() => setActiveModal('NONE')}
        />
      )}

      {/* 4. Add Experience Modal */}
      {activeModal === 'EXPERIENCE' && (
        <AddExperienceModal 
            onSave={handleAddExperience}
            onClose={() => setActiveModal('NONE')}
        />
      )}

      {/* 5. Add Inventory Modal */}
      {activeModal === 'INVENTORY' && (
        <AddInventoryModal
            onSave={handleAddInventory}
            onClose={() => setActiveModal('NONE')}
        />
      )}

      {/* 6. Gold Exchange Modal */}
      {activeModal === 'GOLD' && (
        <GoldExchangeModal
            currentGold={character.gold}
            onUpdate={handleUpdateGold}
            onClose={() => setActiveModal('NONE')}
        />
      )}
      
      {/* 7. Info/AI Modal */}
      {activeModal === 'INFO_MODAL' && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveModal('NONE');
            }}
        >
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-lg text-dagger-gold flex items-center gap-2">
                <InfoIcon /> {infoModalData.topic}
              </h3>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white"><CloseIcon /></button>
            </div>
            <div className="p-6 overflow-y-auto dagger-scroll">
              {infoModalData.loading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-full"></div>
                  <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                </div>
              ) : (
                <MarkdownText content={infoModalData.content} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Character Select Modal */}
      {activeModal === 'CHAR_SELECT' && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveModal('NONE');
            }}
        >
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-white">Saved Characters</h3>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white"><CloseIcon /></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto dagger-scroll space-y-2">
              {savedCharacters.length === 0 && <p className="text-slate-500 text-center py-4">No saved characters found.</p>}
              {savedCharacters.map(char => (
                <div key={char.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition-colors">
                  <div onClick={() => { setCharacter(char); setActiveModal('NONE'); }} className="cursor-pointer flex-1">
                    <div className="font-bold text-white">{char.name}</div>
                    <div className="text-xs text-slate-400">{char.class} Level {char.level}</div>
                  </div>
                  <button onClick={() => requestDeleteSavedChar(char.id!)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded">
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. Delete Confirmation Modal */}
      {deleteModal && (
          <DeleteConfirmModal 
              title={deleteModal.title}
              message={deleteModal.message}
              onConfirm={deleteModal.onConfirm}
              onClose={() => setDeleteModal(null)}
          />
      )}
    </div>
  );
}

// --- SUB-COMPONENTS FOR EDITING ---

function DeleteConfirmModal({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) {
    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-900 rounded-xl w-full max-w-sm border border-slate-700 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 mb-6 text-sm">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded shadow-lg shadow-red-900/20 transition-colors">
                        Delete
                    </button>
                </div>
             </div>
        </div>
    )
}

function GoldExchangeModal({ currentGold, onUpdate, onClose }: { currentGold: number, onUpdate: (val: number) => void, onClose: () => void }) {
    // Break down gold
    const [chests, setChests] = useState(Math.floor(currentGold / 1000));
    const [bags, setBags] = useState(Math.floor((currentGold % 1000) / 100));
    const [handfuls, setHandfuls] = useState(Math.floor((currentGold % 100) / 10));
    const [coins, setCoins] = useState(currentGold % 10);

    // Effect to calculate total and propagate up, and handle rollover logic
    useEffect(() => {
        let newChests = chests;
        let newBags = bags;
        let newHandfuls = handfuls;
        let newCoins = coins;

        // Rollover logic: 10 small = 1 big
        if (newCoins >= 10) { newHandfuls += Math.floor(newCoins / 10); newCoins %= 10; }
        if (newHandfuls >= 10) { newBags += Math.floor(newHandfuls / 10); newHandfuls %= 10; }
        if (newBags >= 10) { newChests += Math.floor(newBags / 10); newBags %= 10; }

        // Rollunder logic (if negative, though inputs usually prevent this, good for safety)
        // For drag inputs, we only allow >= 0 in the UI, but ensuring consistent state:
        
        // Update local state if it changed due to rollover to keep UI in sync
        if (newCoins !== coins || newHandfuls !== handfuls || newBags !== bags || newChests !== chests) {
             setCoins(newCoins);
             setHandfuls(newHandfuls);
             setBags(newBags);
             setChests(newChests);
        }

        const total = (newChests * 1000) + (newBags * 100) + (newHandfuls * 10) + newCoins;
        if (total !== currentGold) {
            onUpdate(total);
        }
    }, [chests, bags, handfuls, coins]);


    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-dagger-gold">Currency Exchange</h3>
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase">Total Gold</div>
                        <div className="text-2xl font-bold text-white">{currentGold}g</div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-8">
                    <DraggableValue value={chests} onChange={setChests} label="Chests (1000g)" />
                    <DraggableValue value={bags} onChange={setBags} label="Bags (100g)" />
                    <DraggableValue value={handfuls} onChange={setHandfuls} label="Handfuls (10g)" />
                    <DraggableValue value={coins} onChange={setCoins} label="Coins (1g)" />
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-400 italic mb-6">
                    "Currency in Daggerheart is fluid. 10 coins make a handful, 10 handfuls a bag, and 10 bags a chest."
                </div>

                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-bold transition-colors">
                        Done
                    </button>
                </div>
             </div>
        </div>
    )
}

function EditCharacterModal({ character, onSave, onClose }: { character: CharacterProfile, onSave: (data: Partial<CharacterProfile>) => void, onClose: () => void }) {
    const [formData, setFormData] = useState(character);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        // Handle number inputs
        if (type === 'number') {
             setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClass = e.target.value;
        const classData = DAGGERHEART_RULES.classes.find(c => c.name === newClass);
        // Default to the first subclass when class changes to prevent mismatch
        const defaultSubclass = classData ? classData.subclasses[0] : '';
        
        setFormData(prev => ({ 
            ...prev, 
            class: newClass,
            subclass: defaultSubclass 
        }));
    };

    const handleTraitChange = (index: number, val: string) => {
        const newVal = parseInt(val) || 0;
        const newTraits = [...formData.traits];
        newTraits[index] = { ...newTraits[index], value: newVal };
        setFormData(prev => ({ ...prev, traits: newTraits }));
    };

    // Derived subclass options based on selected class
    const currentClassData = DAGGERHEART_RULES.classes.find(c => c.name === formData.class);
    const subclassOptions = currentClassData ? currentClassData.subclasses : [];

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-600 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-lg text-white">Edit Character Profile</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><CloseIcon /></button>
            </div>
            
            <div className="p-6 overflow-y-auto dagger-scroll space-y-6">
                {/* Identity */}
                <section>
                    <h4 className="text-dagger-gold font-serif font-bold mb-3 border-b border-slate-700 pb-1">Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Level</label>
                            <input type="number" name="level" value={formData.level} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        
                        {/* Class Select */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Class</label>
                            <select 
                                name="class" 
                                value={formData.class} 
                                onChange={handleClassChange} 
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none appearance-none"
                            >
                                {DAGGERHEART_RULES.classes.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Subclass Select */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Subclass</label>
                            <select 
                                name="subclass" 
                                value={formData.subclass} 
                                onChange={handleChange} 
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none appearance-none"
                            >
                                {subclassOptions.map(sc => (
                                    <option key={sc} value={sc}>{sc}</option>
                                ))}
                            </select>
                        </div>

                        {/* Ancestry Select */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Ancestry</label>
                            <div className="flex items-center gap-3">
                                <SmartAvatar 
                                    ancestry={formData.ancestry}
                                    className="w-10 h-10 rounded border border-slate-600"
                                />
                                <select 
                                    name="ancestry" 
                                    value={formData.ancestry} 
                                    onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none appearance-none"
                                >
                                    {DAGGERHEART_RULES.ancestries.map(anc => (
                                        <option key={anc} value={anc}>{anc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Community Select */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Community</label>
                            <select 
                                name="community" 
                                value={formData.community} 
                                onChange={handleChange} 
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none appearance-none"
                            >
                                {DAGGERHEART_RULES.communities.map(com => (
                                    <option key={com} value={com}>{com}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* Traits */}
                <section>
                    <h4 className="text-dagger-gold font-serif font-bold mb-3 border-b border-slate-700 pb-1">Trait Values</h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {formData.traits.map((t, idx) => (
                            <div key={t.name}>
                                <label className="block text-[10px] text-slate-400 mb-1 uppercase text-center">{t.name}</label>
                                <input 
                                    type="number" 
                                    value={t.value} 
                                    onChange={(e) => handleTraitChange(idx, e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-center text-white focus:border-dagger-hope outline-none" 
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Thresholds & Max Stats */}
                <section>
                    <h4 className="text-dagger-gold font-serif font-bold mb-3 border-b border-slate-700 pb-1">Stats & Thresholds</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Minor Threshold</label>
                            <input type="number" name="minorThreshold" value={formData.minorThreshold} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Major Threshold</label>
                            <input type="number" name="majorThreshold" value={formData.majorThreshold} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Severe Threshold</label>
                            <input type="number" name="severeThreshold" value={formData.severeThreshold} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max Armor Slots</label>
                            <input type="number" name="maxArmor" value={formData.maxArmor} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max Stress</label>
                            <input type="number" name="maxStress" value={formData.maxStress} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Max Hope</label>
                            <input type="number" name="maxHope" value={formData.maxHope} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                         <div>
                            <label className="block text-xs text-slate-400 mb-1">Evasion</label>
                            <input type="number" name="evasion" value={formData.evasion} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" />
                        </div>
                    </div>
                </section>
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded hover:bg-slate-700 text-slate-300 transition-colors">Cancel</button>
                <button onClick={() => onSave(formData)} className="px-6 py-2 bg-dagger-hope text-slate-900 font-bold rounded hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20">Save Changes</button>
            </div>
          </div>
        </div>
    );
}

function AddWeaponModal({ onSave, onClose }: { onSave: (w: Weapon) => void, onClose: () => void }) {
    const [data, setData] = useState<Partial<Weapon>>({
        name: '', type: 'Physical', damage: '', range: 'Melee', description: '', trait: TraitType.Strength
    });

    const handleSubmit = () => {
        if (!data.name || !data.damage) return;
        onSave({ ...data, id: generateSimpleId() } as Weapon);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-white">Add Weapon</h3>
                <input placeholder="Name" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Damage (e.g. d8+2)" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.damage} onChange={e => setData({...data, damage: e.target.value})} />
                    
                    {/* Range Dropdown */}
                    <select className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.range} onChange={e => setData({...data, range: e.target.value})}>
                        {WEAPON_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                     <select className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.type} onChange={e => setData({...data, type: e.target.value as any})}>
                        <option value="Physical">Physical</option>
                        <option value="Magic">Magic</option>
                     </select>
                     <select className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.trait} onChange={e => setData({...data, trait: e.target.value as any})}>
                        {Object.values(TraitType).map(t => <option key={t} value={t}>{t}</option>)}
                     </select>
                </div>
                <textarea placeholder="Description" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white h-24" value={data.description} onChange={e => setData({...data, description: e.target.value})} />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded">Add Weapon</button>
                </div>
             </div>
        </div>
    );
}

function AddAbilityModal({ onSave, onClose }: { onSave: (a: AbilityCard) => void, onClose: () => void }) {
    const [data, setData] = useState<Partial<AbilityCard>>({
        name: '', domain: '', cost: '', description: '', level: 1, active: true
    });
    
    // Auto-detect class/domain context if possible from app state, but here we'll just show suggestions
    const [filteredAbilities, setFilteredAbilities] = useState(SAMPLE_ABILITIES);

    const handleSubmit = () => {
        if (!data.name) return;
        onSave({ ...data, id: generateSimpleId() } as AbilityCard);
    };

    const handleSuggestion = (ability: typeof SAMPLE_ABILITIES[0]) => {
        setData({
            name: ability.name,
            domain: ability.domain,
            cost: ability.cost,
            description: ability.description,
            level: ability.level,
            active: true
        });
    }

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-white mb-4">Add Ability</h3>
                
                <div className="overflow-y-auto dagger-scroll space-y-4 pr-1">
                    <input placeholder="Name" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                    <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Domain (e.g. Blade)" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.domain} onChange={e => setData({...data, domain: e.target.value})} />
                        <input placeholder="Cost (e.g. 1 Hope)" className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.cost} onChange={e => setData({...data, cost: e.target.value})} />
                    </div>
                    <textarea placeholder="Description" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white h-24" value={data.description} onChange={e => setData({...data, description: e.target.value})} />

                    {/* Suggestions Panel */}
                    <div className="border-t border-slate-700 pt-3">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Suggestions (Level 1)</h4>
                         <div className="space-y-2">
                            {filteredAbilities.map(ab => (
                                <button 
                                    key={ab.name} 
                                    onClick={() => handleSuggestion(ab)}
                                    className="w-full text-left p-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded flex justify-between items-center group"
                                >
                                    <div>
                                        <div className="text-sm font-bold text-dagger-gold">{ab.name}</div>
                                        <div className="text-[10px] text-slate-400">{ab.domain} • {ab.cost}</div>
                                    </div>
                                    <span className="text-slate-500 group-hover:text-white transition-colors">+</span>
                                </button>
                            ))}
                         </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded">Add Ability</button>
                </div>
             </div>
        </div>
    );
}

function AddExperienceModal({ onSave, onClose }: { onSave: (e: Experience) => void, onClose: () => void }) {
    const [data, setData] = useState<Partial<Experience>>({
        name: '', description: '', value: 2
    });

    const handleSubmit = () => {
        if (!data.name) return;
        onSave({ ...data, id: generateSimpleId(), value: data.value || 2 } as Experience);
    };

    const handleSuggestion = (name: string) => {
        setData({ ...data, name, description: `Background: ${name}`, value: 2 });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-white mb-4">Add Experience</h3>
                
                <div className="space-y-4 overflow-y-auto dagger-scroll pr-1 pb-4">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-9">
                             <label className="text-xs text-slate-400 block mb-1">Experience Name</label>
                             <input placeholder="e.g. Raised by Wolves" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-slate-400 block mb-1">Bonus</label>
                             <div className="flex bg-slate-900 rounded border border-slate-700 p-1">
                                <button onClick={() => setData({...data, value: 1})} className={`flex-1 text-sm rounded ${data.value === 1 ? 'bg-dagger-hope text-slate-900 font-bold' : 'text-slate-400'}`}>+1</button>
                                <button onClick={() => setData({...data, value: 2})} className={`flex-1 text-sm rounded ${data.value === 2 ? 'bg-dagger-hope text-slate-900 font-bold' : 'text-slate-400'}`}>+2</button>
                             </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Description</label>
                        <textarea placeholder="Briefly describe this experience..." className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white h-20" value={data.description} onChange={e => setData({...data, description: e.target.value})} />
                    </div>

                    {/* Suggestions */}
                    <div className="border-t border-slate-700 pt-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Templates</h4>
                        <div className="space-y-3">
                            {Object.entries(EXAMPLE_EXPERIENCES).map(([category, items]) => (
                                <div key={category}>
                                    <h5 className="text-[10px] text-dagger-gold font-bold mb-1.5">{category}</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {items.map(item => (
                                            <button 
                                                key={item}
                                                onClick={() => handleSuggestion(item)}
                                                className="text-xs bg-slate-700 hover:bg-slate-600 hover:text-white border border-slate-600 rounded-full px-3 py-1 text-slate-300 transition-colors"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-700 mt-auto">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSubmit} disabled={!data.name} className="px-4 py-2 bg-dagger-hope text-slate-900 font-bold rounded hover:bg-cyan-400 disabled:opacity-50">Add Experience</button>
                </div>
             </div>
        </div>
    );
}

function AddInventoryModal({ onSave, onClose }: { onSave: (item: string) => void, onClose: () => void }) {
    const [itemName, setItemName] = useState('');
    
    // Flatten COMMON_ITEMS into categories for easier rendering
    const categories = Object.keys(COMMON_ITEMS) as Array<keyof typeof COMMON_ITEMS>;

    const handleQuickAdd = (item: string) => {
        setItemName(item);
    };

    const handleSubmit = () => {
        if (!itemName) return;
        onSave(itemName);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
  if (e.target === e.currentTarget) {
    onClose(); // or setActiveModal('NONE')
  }
}}
        >
             <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg text-white mb-4">Add Inventory Item</h3>
                
                {/* Custom Input */}
                <div className="flex gap-2 mb-6">
                    <input 
                        placeholder="Item Name / Description" 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:border-dagger-hope outline-none" 
                        value={itemName} 
                        onChange={e => setItemName(e.target.value)}
                        autoFocus
                    />
                    <button onClick={handleSubmit} disabled={!itemName} className="px-4 py-2 bg-dagger-hope text-slate-900 font-bold rounded hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed">
                        Add
                    </button>
                </div>

                {/* Quick Add Section */}
                <div className="flex-1 overflow-y-auto dagger-scroll pr-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Add Common Items</h4>
                    <div className="space-y-4">
                        {categories.map(cat => (
                            <div key={cat}>
                                <h5 className="text-dagger-gold text-sm font-bold mb-2 border-b border-slate-700/50 pb-1">{cat}</h5>
                                <div className="flex flex-wrap gap-2">
                                    {COMMON_ITEMS[cat].map(item => (
                                        <button 
                                            key={item}
                                            onClick={() => handleQuickAdd(item)}
                                            className="text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-2 py-1 text-slate-300 transition-colors"
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">Cancel</button>
                </div>
             </div>
        </div>
    );
}
