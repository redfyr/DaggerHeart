
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_CHARACTER, BLANK_CHARACTER, DAGGERHEART_RULES, STATIC_INFO, COMMON_ITEMS, EXAMPLE_EXPERIENCES, CLASS_DOMAINS, WEAPON_RANGES, DOMAIN_RESOURCES, ALL_DOMAIN_CARDS, DomainCardData, DOMAIN_DESCRIPTIONS } from './constants';
import { CharacterProfile, TraitType, RollResult, Weapon, AbilityCard, Experience } from './types';
import { getRulesInsight, subscribeToUsage, sendChatRuleQuery } from './services/geminiService';
import { saveCharacterToDB, getAllCharacters, deleteCharacterFromDB } from './services/db';

// --- Constants ---
const MAX_HP = 6; // Daggerheart standard HP slots

// --- Icons (Font Awesome Wrappers) ---
const InfoIcon = () => <i className="fa-solid fa-circle-info inline-block opacity-50 hover:opacity-100 transition-opacity cursor-help text-base" />;
const EditIcon = () => <i className="fa-solid fa-pen-to-square text-lg" />;
const FolderIcon = () => <i className="fa-solid fa-folder-open text-lg" />;
const CheckIcon = () => <i className="fa-solid fa-check text-lg" />;
const TrashIcon = () => <i className="fa-solid fa-trash-can text-sm" />;
const PlusIcon = () => <i className="fa-solid fa-plus text-sm" />;
const FilePlusIcon = () => <i className="fa-solid fa-file-circle-plus text-lg" />;
const CloseIcon = () => <i className="fa-solid fa-xmark text-xl" />;
const BackIcon = () => <i className="fa-solid fa-arrow-left text-lg" />;
const SwordIcon = () => <i className="fa-solid fa-khanda text-base" />; // Khanda looks sufficiently like a fantasy sword
const SearchIcon = () => <i className="fa-solid fa-magnifying-glass text-sm" />;
const CommentIcon = () => <i className="fa-solid fa-comment-dots text-2xl" />;
const PaperPlaneIcon = () => <i className="fa-solid fa-paper-plane text-sm" />;

// Currency Icons
const ChestIcon = () => (
    <svg viewBox="0 0 512 512" fill="currentColor" height="1em" width="1em" className="block text-base mx-auto">
        <path d="M32 160c-17.7 0-32 14.3-32 32V384c0 53 43 96 96 96H416c53 0 96-43 96-96V192c0-17.7-14.3-32-32-32H32zm160 80h32 32 32c8.8 0 16 7.2 16 16v16c0 17.7-14.3 32-32 32H240c-17.7 0-32-14.3-32-32V256c0-8.8 7.2-16 16-16zM64 80C64 53.5 85.5 32 112 32H400c26.5 0 48 21.5 48 48v48H64V80z" />
    </svg>
);
const BagIcon = () => <i className="fa-solid fa-sack-dollar text-base" />;
const HandIcon = () => <i className="fa-solid fa-hand-holding-dollar text-base" />;
const CoinIcon = () => <i className="fa-solid fa-coins text-base" />;


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

// --- Helper: Roman Numerals ---
const toRoman = (num: number): string => {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
};

// --- Helper: Robust ID Generator ---
const generateSimpleId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- Smart Avatar Component ---
function SmartAvatar({ ancestry, className, level }: { ancestry: string, className?: string, level?: number }) {
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
            
            {/* Level Badge (Roman Numeral) - Centered Bottom */}
            {level !== undefined && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-dagger-gold/60 px-2 py-0.5 rounded shadow-lg shadow-black z-30 min-w-[1.5rem] text-center">
                    <span className="text-dagger-gold font-serif font-bold text-[10px] leading-none tracking-wider block">
                        {toRoman(level)}
                    </span>
                </div>
            )}
         </div>
    )
}

// --- Markdown Text Renderer ---
const MarkdownText = ({ content }: { content: string }) => {
  if (!content) return null;
  const lines = content.split('\n');
  
  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*[^*]+?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-dagger-gold font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="text-slate-200 italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="text-slate-300 text-sm leading-relaxed space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;
        
        if (trimmed.startsWith('### ')) {
            return <h4 key={i} className="text-dagger-gold font-bold text-base mt-3 mb-1">{parseInline(trimmed.slice(4))}</h4>;
        }
        if (trimmed.startsWith('## ')) {
            return <h3 key={i} className="text-white font-serif font-bold text-lg mt-4 mb-2 border-b border-slate-700 pb-1">{parseInline(trimmed.slice(3))}</h3>;
        }
        if (trimmed.startsWith('# ')) {
             return <h2 key={i} className="text-white font-serif font-bold text-xl mt-5 mb-3">{parseInline(trimmed.slice(2))}</h2>;
        }

        if (trimmed.match(/^[*•-]\s/)) {
             return (
                <div key={i} className="flex items-start gap-2 pl-2">
                  <span className="text-dagger-gold/70 mt-1.5 text-[6px] flex-shrink-0"><i className="fa-solid fa-circle" /></span>
                  <span className="flex-1">{parseInline(trimmed.replace(/^[*•-]\s/, ''))}</span>
                </div>
              );
        }

        if (trimmed.match(/^\d+\.\s/)) {
            const match = trimmed.match(/^(\d+)\.\s/);
            const num = match ? match[1] : '';
            return (
                <div key={i} className="flex items-start gap-2 pl-2">
                    <span className="text-dagger-gold font-bold min-w-[1.2rem] text-right flex-shrink-0">{num}.</span>
                    <span className="flex-1">{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
        }

        return <div key={i}>{parseInline(line)}</div>;
      })}
    </div>
  );
};

// --- Draggable Value Component ---
function DraggableValue({ 
    value, 
    onChange, 
    label,
    min = 0,
    max = 9999,
    loop
}: { 
    value: number, 
    onChange: (val: number) => void, 
    label: string,
    min?: number,
    max?: number,
    loop?: number
}) {
    const startY = useRef(0);
    const startVal = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        startY.current = e.clientY;
        startVal.current = value;
        document.body.style.cursor = 'grab';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const delta = e.clientY - startY.current;
        const steps = Math.floor(delta / 30);
        
        const newVal = Math.min(max, Math.max(min, startVal.current + steps));
        if (newVal !== value) onChange(newVal);
    };

    const handleMouseUp = () => {
        document.body.style.cursor = 'default';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        startVal.current = value;
        document.body.style.overflow = 'hidden';
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const delta = e.touches[0].clientY - startY.current;
        const steps = Math.floor(delta / 30);
        const newVal = Math.min(max, Math.max(min, startVal.current + steps));
        if (newVal !== value) onChange(newVal);
    };

    const handleTouchEnd = () => {
        document.body.style.overflow = '';
    };

    const nextVal = loop ? (value + 1) % loop : value + 1;
    const prevVal = loop ? (value - 1 + loop) % loop : value - 1;

    const showNext = loop ? true : nextVal <= max;
    const showPrev = loop ? true : prevVal >= min;

    return (
        <div className="flex flex-col items-center select-none">
            <label className="text-[13px] text-slate-300 uppercase font-bold mb-1 tracking-wider">{label}</label>
            <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-1 border border-slate-700 w-full justify-between h-24 relative overflow-hidden group hover:border-slate-500 transition-colors">
                 
                 <button 
                    onClick={() => onChange(Math.max(min, value - 1))} 
                    disabled={!loop && value <= min}
                    className="z-20 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <i className="fa-solid fa-minus text-xs" />
                </button>

                <div 
                    className="flex-1 h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing relative"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="absolute top-0 w-full h-6 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 w-full h-6 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>

                    <div className="flex flex-col items-center justify-center gap-0 w-full">
                         <div className={`text-lg font-bold text-slate-600 opacity-40 translate-y-1 ${!showNext ? 'invisible' : ''}`}>{nextVal}</div> 
                         <div className="text-4xl font-bold text-slate-100 py-0 z-0 scale-110">{value}</div>
                         <div className={`text-lg font-bold text-slate-600 opacity-40 -translate-y-1 ${!showPrev ? 'invisible' : ''}`}>{prevVal}</div>
                    </div>
                </div>

                <button 
                    onClick={() => onChange(Math.min(max, value + 1))} 
                    disabled={!loop && value >= max}
                    className="z-20 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <i className="fa-solid fa-plus text-xs" />
                </button>
            </div>
        </div>
    );
}

// --- Chat Widget Component ---
function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
        {role: 'assistant', text: "Greetings! I am your Daggerheart rules guide. Ask me a question."}
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!query.trim() || loading) return;
        
        const userMsg = query.trim();
        setQuery("");
        setMessages(prev => [...prev, {role: 'user', text: userMsg}]);
        setLoading(true);

        const response = await sendChatRuleQuery(userMsg);
        
        setMessages(prev => [...prev, {role: 'assistant', text: response}]);
        setLoading(false);
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-24 w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-dagger-gold rounded-full shadow-xl flex items-center justify-center transition-all z-40 hover:scale-110 active:scale-95"
                title="Ask Rules Bot"
            >
                <CommentIcon />
            </button>
        );
    }

    return (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
            {/* Header */}
            <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-dagger-gold text-sm flex items-center gap-2">
                    <CommentIcon /> Rules Assistant
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><CloseIcon /></button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 dagger-scroll bg-slate-900/90">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-2 text-sm ${
                            msg.role === 'user' 
                                ? 'bg-dagger-gold text-slate-900 font-medium rounded-tr-none' 
                                : 'bg-slate-800 text-slate-300 border border-slate-700 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 text-slate-400 text-xs px-3 py-2 rounded-lg rounded-tl-none border border-slate-700 italic animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 bg-slate-800 border-t border-slate-700 flex gap-2">
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask a rule question..."
                    className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-dagger-gold"
                />
                <button 
                    onClick={handleSend}
                    disabled={loading}
                    className="w-8 h-8 flex items-center justify-center bg-dagger-gold hover:bg-yellow-400 text-slate-900 rounded disabled:opacity-50 transition-colors"
                >
                    <PaperPlaneIcon />
                </button>
            </div>
        </div>
    );
}

// --- MODAL COMPONENTS ---

const DeleteConfirmModal = ({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-600 shadow-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold">Confirm</button>
      </div>
    </div>
  </div>
);

const NumberStepper = ({ label, value, onChange, min = 0, max = 99 }: { label: string, value: number, onChange: (val: number) => void, min?: number, max?: number }) => (
    <div>
        <label className="block text-xs text-slate-500 uppercase font-bold mb-1">{label}</label>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded p-1">
            <button 
                onClick={() => onChange(Math.max(min, value - 1))}
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
                <i className="fa-solid fa-minus text-xs" />
            </button>
            <div className="flex-1 text-center font-bold text-white text-lg">
                {value}
            </div>
            <button 
                onClick={() => onChange(Math.min(max, value + 1))}
                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            >
                <i className="fa-solid fa-plus text-xs" />
            </button>
        </div>
    </div>
);

const EditCharacterModal = ({ character, onSave, onClose }: { character: CharacterProfile, onSave: (data: Partial<CharacterProfile>) => void, onClose: () => void }) => {
    const [formData, setFormData] = useState(character);

    const handleChange = (field: keyof CharacterProfile, value: any) => {
        if (field === 'level') {
            value = Math.max(1, Math.min(10, value));
        }
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleTraitChange = (index: number, val: number) => {
        const newTraits = [...formData.traits];
        newTraits[index] = { ...newTraits[index], value: val };
        setFormData(prev => ({ ...prev, traits: newTraits }));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-600 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-white text-lg">Edit Character Sheet</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto dagger-scroll space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Name</label>
                            <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Level</label>
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded p-1">
                                <button 
                                    onClick={() => handleChange('level', Math.max(1, formData.level - 1))}
                                    className="w-14 h-14 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                >
                                    <i className="fa-solid fa-minus text-xl" />
                                </button>
                                <div className="flex-1 text-center font-bold text-white text-3xl">
                                    {formData.level}
                                </div>
                                <button 
                                    onClick={() => handleChange('level', Math.min(10, formData.level + 1))}
                                    className="w-14 h-14 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                                >
                                    <i className="fa-solid fa-plus text-xl" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Class</label>
                            <select value={formData.class} onChange={e => handleChange('class', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                {DAGGERHEART_RULES.classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Subclass</label>
                            <select value={formData.subclass} onChange={e => handleChange('subclass', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                {DAGGERHEART_RULES.classes.find(c => c.name === formData.class)?.subclasses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Ancestry</label>
                            <div className="flex items-center gap-3">
                                <SmartAvatar ancestry={formData.ancestry} level={formData.level} className="w-10 h-10 rounded-md border border-slate-600 shadow-sm" />
                                <select value={formData.ancestry} onChange={e => handleChange('ancestry', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                    {DAGGERHEART_RULES.ancestries.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>
                         <div>
                            <label className="block text-lg text-slate-400 uppercase font-bold mb-1">Community</label>
                            <select value={formData.community} onChange={e => handleChange('community', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white">
                                {DAGGERHEART_RULES.communities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-400 mb-4 border-b border-slate-700 pb-1">Traits</h4>
                        <div className="grid grid-cols-2 gap-6">
                            {formData.traits.map((t, i) => (
                                <DraggableValue 
                                    key={t.name}
                                    label={t.name}
                                    value={t.value}
                                    onChange={(val) => handleTraitChange(i, val)}
                                    min={-6}
                                    max={15}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mt-2">
                        <h4 className="text-sm font-bold text-slate-400 mb-4 border-b border-slate-700 pb-1">Vitals & Thresholds</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                             <NumberStepper label="Evasion" value={formData.evasion} onChange={v => handleChange('evasion', v)} />
                             <NumberStepper label="Max Armor" value={formData.maxArmor} onChange={v => handleChange('maxArmor', v)} />
                             <NumberStepper label="Max Stress" value={formData.maxStress} onChange={v => handleChange('maxStress', v)} />
                             <NumberStepper label="Max Hope" value={formData.maxHope} onChange={v => handleChange('maxHope', v)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                             <NumberStepper label="Minor Threshold" value={formData.minorThreshold} onChange={v => handleChange('minorThreshold', v)} />
                             <NumberStepper label="Major Threshold" value={formData.majorThreshold} onChange={v => handleChange('majorThreshold', v)} />
                             <NumberStepper label="Severe Threshold" value={formData.severeThreshold} onChange={v => handleChange('severeThreshold', v)} />
                        </div>
                    </div>

                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-2 bg-slate-900/50">
                     <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                     <button onClick={() => onSave(formData)} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded hover:bg-yellow-400">Save Profile</button>
                </div>
            </div>
        </div>
    );
};

const AddWeaponModal = ({ onSave, onClose }: { onSave: (w: Weapon) => void, onClose: () => void }) => {
    const [weapon, setWeapon] = useState<Partial<Weapon>>({
        name: "", type: "Physical", damage: "d8", range: "Melee", trait: TraitType.Strength, description: ""
    });

    const handleSave = () => {
        if (!weapon.name) return;
        onSave({ ...weapon, id: generateSimpleId() } as Weapon);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-lg mb-4">Add Weapon</h3>
                
                <div className="mb-4">
                    <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Quick Select</label>
                    <select 
                        onChange={(e) => {
                            const std = DAGGERHEART_RULES.standardWeapons.find(w => w.name === e.target.value);
                            if (std) {
                                setWeapon({
                                    name: std.name,
                                    type: std.type as "Physical" | "Magic",
                                    damage: std.damage,
                                    range: std.range,
                                    trait: std.trait as TraitType,
                                    description: std.desc
                                });
                            }
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-slate-300"
                    >
                        <option value="">-- Choose Standard Weapon --</option>
                        {DAGGERHEART_RULES.standardWeapons.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <input placeholder="Name" value={weapon.name} onChange={e => setWeapon({...weapon, name: e.target.value})} className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                     
                     <select value={weapon.type} onChange={e => setWeapon({...weapon, type: e.target.value as any})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        <option value="Physical">Physical</option>
                        <option value="Magic">Magic</option>
                     </select>
                     
                     <select value={weapon.trait} onChange={e => setWeapon({...weapon, trait: e.target.value as TraitType})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        {Object.values(TraitType).map(t => <option key={t} value={t}>{t}</option>)}
                     </select>

                     <input placeholder="Damage (e.g. d10+2)" value={weapon.damage} onChange={e => setWeapon({...weapon, damage: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />

                     <select value={weapon.range} onChange={e => setWeapon({...weapon, range: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                        {WEAPON_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                     </select>
                </div>
                
                <textarea placeholder="Description / Abilities" value={weapon.description} onChange={e => setWeapon({...weapon, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-24" />

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add Weapon</button>
                </div>
            </div>
        </div>
    );
};

const AddAbilityModal = ({ character, onSave, onClose }: { character: CharacterProfile, onSave: (a: AbilityCard) => void, onClose: () => void }) => {
    // Mode: CHOICE (start), PRESET (official cards), CUSTOM (manual entry)
    const [mode, setMode] = useState<'CHOICE' | 'PRESET' | 'CUSTOM'>('CHOICE');

    // Preset State
    const [filterDomain, setFilterDomain] = useState<string>(CLASS_DOMAINS[character.class]?.[0] || DAGGERHEART_RULES.domains[0]);
    const [filterLevel, setFilterLevel] = useState<number>(character.level);
    const [selectedCard, setSelectedCard] = useState<DomainCardData | null>(null);

    // Custom State
    const [customAbility, setCustomAbility] = useState<Partial<AbilityCard>>({
        name: "", domain: CLASS_DOMAINS[character.class]?.[0] || "Blade", cost: "1 Hope", description: "", level: 1, active: true, type: "Ability", isPreset: false
    });

    // Helper to get matching cards
    const filteredCards = ALL_DOMAIN_CARDS.filter(c => 
        c.domain === filterDomain && c.level <= filterLevel
    ).sort((a, b) => a.level - b.level);

    const handleSavePreset = () => {
        if (!selectedCard) return;
        onSave({
            id: generateSimpleId(),
            name: selectedCard.name,
            domain: selectedCard.domain,
            level: selectedCard.level,
            cost: selectedCard.cost,
            description: selectedCard.description,
            type: selectedCard.type,
            active: true,
            isPreset: true // Locks editing
        });
    };

    const handleSaveCustom = () => {
        if (!customAbility.name) return;
        onSave({ ...customAbility, id: generateSimpleId(), isPreset: false } as AbilityCard);
    };

    // --- RENDERERS ---

    const renderChoiceScreen = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
             <button 
                onClick={() => setMode('PRESET')}
                className="flex flex-col items-center justify-center p-8 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-dagger-gold rounded-xl transition-all group gap-4"
             >
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-dagger-gold text-2xl group-hover:scale-110 transition-transform shadow-lg">
                    <SearchIcon />
                </div>
                <div className="text-center">
                    <h4 className="text-xl font-bold text-white mb-1">Domain Cards</h4>
                    <p className="text-sm text-slate-400">Choose from the official Daggerheart domain decks.</p>
                </div>
             </button>

             <button 
                onClick={() => setMode('CUSTOM')}
                className="flex flex-col items-center justify-center p-8 bg-slate-700/50 hover:bg-slate-700 border-2 border-slate-600 hover:border-sky-400 rounded-xl transition-all group gap-4"
             >
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 text-2xl group-hover:scale-110 transition-transform shadow-lg">
                    <EditIcon />
                </div>
                <div className="text-center">
                    <h4 className="text-xl font-bold text-white mb-1">Custom Ability</h4>
                    <p className="text-sm text-slate-400">Create your own homebrew ability or spell.</p>
                </div>
             </button>
        </div>
    );

    const renderPresetScreen = () => (
        <div className="flex flex-col h-full overflow-hidden">
             {/* Filters */}
             <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Domain</label>
                    <select 
                        value={filterDomain} 
                        onChange={e => setFilterDomain(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    >
                         {/* Show Class Domains first */}
                         <optgroup label="Class Domains">
                            {CLASS_DOMAINS[character.class]?.map(d => <option key={d} value={d}>{d}</option>)}
                         </optgroup>
                         <optgroup label="All Domains">
                            {DAGGERHEART_RULES.domains.filter(d => !CLASS_DOMAINS[character.class]?.includes(d)).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                         </optgroup>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Max Level</label>
                    <select 
                        value={filterLevel} 
                        onChange={e => setFilterLevel(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    >
                        {Array.from({length: 10}).map((_, i) => (
                            <option key={i+1} value={i+1}>Level {i+1}</option>
                        ))}
                    </select>
                </div>
             </div>

             {/* Content Area: List + Preview */}
             <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                 
                 {/* List */}
                 <div className="overflow-y-auto dagger-scroll bg-slate-900/50 rounded-lg border border-slate-700 p-2 space-y-2">
                    {filteredCards.length === 0 && (
                        <div className="text-center p-4 text-slate-500 italic">No cards found for this selection.</div>
                    )}
                    {filteredCards.map(c => (
                        <div 
                            key={c.name}
                            onClick={() => setSelectedCard(c)}
                            className={`p-3 rounded border cursor-pointer transition-all ${selectedCard?.name === c.name ? 'bg-slate-700 border-dagger-gold shadow-lg' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-200 text-sm">{c.name}</span>
                                <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">Lvl {c.level}</span>
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-slate-500">
                                <span>{c.type}</span>
                                <span>{c.cost}</span>
                            </div>
                        </div>
                    ))}
                 </div>

                 {/* Preview */}
                 <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 flex flex-col relative">
                    {!selectedCard ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 italic text-sm text-center">
                            Select a card from the list to preview.
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-slate-600 pb-3 mb-3">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-xl text-white font-serif">{selectedCard.name}</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${DOMAIN_RESOURCES[selectedCard.domain]?.colorBg || 'bg-slate-600'} text-white shadow-sm`}>
                                        {selectedCard.domain}
                                    </span>
                                </div>
                                <div className="flex gap-3 text-xs text-dagger-gold font-bold uppercase tracking-wider">
                                    <span>Level {selectedCard.level}</span>
                                    <span>•</span>
                                    <span>{selectedCard.type}</span>
                                    <span>•</span>
                                    <span>{selectedCard.cost}</span>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto dagger-scroll text-sm text-slate-300 leading-relaxed">
                                {selectedCard.description}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <button 
                                    onClick={handleSavePreset}
                                    className="w-full py-2 bg-dagger-gold hover:bg-yellow-400 text-slate-900 font-bold rounded shadow transition-colors"
                                >
                                    Add Ability
                                </button>
                            </div>
                        </>
                    )}
                 </div>
             </div>
        </div>
    );

    const renderCustomScreen = () => (
        <div className="flex flex-col h-full overflow-y-auto dagger-scroll p-1">
            <div className="grid grid-cols-2 gap-4 mb-4">
                 <input placeholder="Name" value={customAbility.name} onChange={e => setCustomAbility({...customAbility, name: e.target.value})} className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                 
                 <select value={customAbility.domain} onChange={e => setCustomAbility({...customAbility, domain: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white">
                    {DAGGERHEART_RULES.domains.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
                 
                 <input placeholder="Level" type="number" value={customAbility.level} onChange={e => setCustomAbility({...customAbility, level: parseInt(e.target.value)})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />

                 <input placeholder="Type (e.g. Spell)" value={customAbility.type} onChange={e => setCustomAbility({...customAbility, type: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                 
                 <input placeholder="Cost (e.g. 1 Hope)" value={customAbility.cost} onChange={e => setCustomAbility({...customAbility, cost: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white" />
            </div>
            
            <textarea placeholder="Description" value={customAbility.description} onChange={e => setCustomAbility({...customAbility, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-32 mb-4" />

            <div className="mt-auto flex justify-end">
                <button onClick={handleSaveCustom} className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded shadow transition-colors">
                    Create Custom Ability
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-600 shadow-2xl flex flex-col h-[600px] max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        {mode !== 'CHOICE' && (
                            <button onClick={() => setMode('CHOICE')} className="text-slate-400 hover:text-white transition-colors">
                                <BackIcon />
                            </button>
                        )}
                        <h3 className="font-bold text-white text-lg">
                            {mode === 'CHOICE' ? 'Add Ability' : (mode === 'PRESET' ? 'Select Domain Card' : 'Create Custom Ability')}
                        </h3>
                    </div>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>

                {/* Body */}
                <div className="flex-1 p-6 overflow-hidden">
                    {mode === 'CHOICE' && renderChoiceScreen()}
                    {mode === 'PRESET' && renderPresetScreen()}
                    {mode === 'CUSTOM' && renderCustomScreen()}
                </div>
            </div>
        </div>
    );
};

const AddExperienceModal = ({ onSave, onClose }: { onSave: (e: Experience) => void, onClose: () => void }) => {
    const [exp, setExp] = useState<Partial<Experience>>({
        name: "", value: 2, description: ""
    });

    const handleSave = () => {
        if (!exp.name) return;
        onSave({ ...exp, id: generateSimpleId() } as Experience);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-lg mb-4">Add Experience</h3>
                
                <div className="space-y-3">
                     <input placeholder="Name (e.g. Ex-Soldier)" value={exp.name} onChange={e => setExp({...exp, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                     
                     <div className="flex items-center gap-4">
                        <label className="text-slate-400 text-sm">Bonus Value:</label>
                        <div className="flex gap-2">
                             {[1, 2, 3].map(v => (
                                 <button 
                                    key={v}
                                    onClick={() => setExp({...exp, value: v})}
                                    className={`w-10 h-10 rounded border ${exp.value === v ? 'bg-dagger-hope border-dagger-hope text-black font-bold' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                                 >
                                    +{v}
                                 </button>
                             ))}
                        </div>
                     </div>

                     <textarea placeholder="Description" value={exp.description} onChange={e => setExp({...exp, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-20" />
                </div>
                
                {/* Suggestions */}
                <div className="mt-4">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLE_EXPERIENCES.Background.slice(0, 5).map(ex => (
                            <button key={ex} onClick={() => setExp(prev => ({...prev, name: ex}))} className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300 hover:text-white">{ex}</button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add Experience</button>
                </div>
            </div>
        </div>
    );
};

const AddInventoryModal = ({ onSave, onClose }: { onSave: (item: string) => void, onClose: () => void }) => {
    const [item, setItem] = useState("");

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-600 shadow-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-lg mb-4">Add Item</h3>
                <input placeholder="Item Name" value={item} onChange={e => setItem(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" autoFocus />
                
                <div className="max-h-40 overflow-y-auto dagger-scroll space-y-2 mt-2">
                    {Object.entries(COMMON_ITEMS).map(([cat, items]) => (
                        <div key={cat}>
                            <p className="text-[10px] text-slate-500 uppercase font-bold mt-2 mb-1">{cat}</p>
                            <div className="flex flex-wrap gap-1">
                                {items.map(i => (
                                    <button key={i} onClick={() => setItem(i)} className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300">{i}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={() => onSave(item)} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add Item</button>
                </div>
            </div>
        </div>
    );
};

const GoldExchangeModal = ({ currentGold, onUpdate, onClose }: { currentGold: number, onUpdate: (g: number) => void, onClose: () => void }) => {
    const [totalGold, setTotalGold] = useState(currentGold);

    // Derived breakdown
    const chests = Math.floor(totalGold / 1000);
    const bags = Math.floor((totalGold % 1000) / 100);
    const handfuls = Math.floor((totalGold % 100) / 10);
    const coins = totalGold % 10;

    useEffect(() => {
        onUpdate(totalGold);
    }, [totalGold]);

    const handleChange = (diff: number) => {
        const newTotal = totalGold + diff;
        setTotalGold(Math.max(0, newTotal));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                     <h3 className="font-bold text-white text-lg">Your Hoard</h3>
                     <button onClick={onClose}><CloseIcon /></button>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                     <DraggableValue 
                        value={chests} 
                        onChange={(val) => handleChange((val - chests) * 1000)} 
                        label="Chests" 
                        min={0}
                        max={999}
                     />
                     <DraggableValue 
                        value={bags} 
                        onChange={(val) => handleChange((val - bags) * 100)} 
                        label="Bags" 
                        min={-1000} 
                        max={1000}
                        loop={10}
                     />
                     <DraggableValue 
                        value={handfuls} 
                        onChange={(val) => handleChange((val - handfuls) * 10)} 
                        label="Handfuls" 
                        min={-1000} 
                        max={1000}
                        loop={10}
                     />
                     <DraggableValue 
                        value={coins} 
                        onChange={(val) => handleChange(val - coins)} 
                        label="Coins" 
                        min={-1000} 
                        max={1000}
                        loop={10}
                     />
                </div>

                <div className="text-center p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Approximate Value</div>
                    <div className="text-2xl font-bold text-dagger-gold">{totalGold} Gold</div>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/30 text-xs text-slate-400 space-y-3">
                    <h4 className="text-dagger-gold font-bold uppercase tracking-wider mb-2">Currency Guide</h4>
                    <div>
                        <span className="font-bold text-white block mb-0.5">Coin (1g)</span>
                        A hot meal, ale, travel rations, small bribe.
                    </div>
                    <div>
                        <span className="font-bold text-white block mb-0.5">Handful (10g)</span>
                        Basic supplies, night at an inn, simple tools.
                    </div>
                    <div>
                        <span className="font-bold text-white block mb-0.5">Bag (100g)</span>
                        Weapons, armor, horse, fine luxury items.
                    </div>
                    <div>
                        <span className="font-bold text-white block mb-0.5">Chest (1000g)</span>
                        Sailing ship, small estate, masterwork relics.
                    </div>
                </div>

                <div className="flex justify-center">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-all">Done</button>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [character, setCharacter] = useState<CharacterProfile>(INITIAL_CHARACTER);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [showRollDetail, setShowRollDetail] = useState(false);
  const [isSuccessChecked, setIsSuccessChecked] = useState(false);
  
  // Animation Focus State
  const [animatingResource, setAnimatingResource] = useState<'hope' | 'stress' | null>(null);
  const hopePanelRef = useRef<HTMLDivElement>(null);
  const stressPanelRef = useRef<HTMLDivElement>(null);

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

  // Ref to track accidental clicks on backdrop (drag from inside to outside)
  const backdropRef = useRef<EventTarget | null>(null);

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
    setIsSuccessChecked(false); // Reset check
    setShowRollDetail(true); // Automatically open the roll detail
  };

  const handleSuccessConfirmation = () => {
    if (!rollResult) return;
    setIsSuccessChecked(true);

    // Delay briefly to show the tick, then trigger animation
    setTimeout(() => {
        setShowRollDetail(false);
        setIsSuccessChecked(false);

        if (rollResult.isCrit) {
             // Critical: Reduce Stress
             setAnimatingResource('stress');
             setCharacter(prev => ({ ...prev, stress: Math.max(0, prev.stress - 1) }));
             stressPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
             // Success with Hope: Add Hope
             setAnimatingResource('hope');
             setCharacter(prev => ({ ...prev, hope: Math.min(prev.maxHope, prev.hope + 1) }));
             hopePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Reset animation after 1.5s
        setTimeout(() => {
            setAnimatingResource(null);
        }, 1500);

    }, 400); // Short delay for visual tick feedback
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
    // Check if Class or Level has changed, which might invalidate existing abilities
    setCharacter(prev => {
        const updatedChar = { ...prev, ...formData };
        
        // If Class or Level changed, filter abilities
        if (formData.class || formData.level) {
            const validDomains = CLASS_DOMAINS[updatedChar.class] || [];
            const currentLevel = updatedChar.level;

            const validAbilities = updatedChar.abilities.filter(ability => {
                // Keep presets only if they match new class/level rules
                if (ability.isPreset) {
                    if (validDomains.includes(ability.domain)) {
                        return ability.level <= currentLevel;
                    }
                    return false;
                }
                // Custom abilities are usually kept, or we can apply strict level rule
                return ability.level <= currentLevel;
            });
            
            return { ...updatedChar, abilities: validAbilities };
        }

        return updatedChar;
    });
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

  const handleDomainClick = (domain: string) => {
    const info = DOMAIN_DESCRIPTIONS[domain];
    if (info) {
        setInfoModalData({ 
            topic: `${domain} Domain`, 
            content: `**Core Theme:**\n${info.description}\n\n**Associated Classes:**\n${info.classes}`, 
            loading: false 
        });
        setActiveModal('INFO_MODAL');
    }
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
  
  // Calculate gold display
  const chests = Math.floor(character.gold / 1000);
  const bags = Math.floor((character.gold % 1000) / 100);
  const handfuls = Math.floor((character.gold % 100) / 10);
  const coins = character.gold % 10;

  // Get current domains
  const characterDomains = CLASS_DOMAINS[character.class] || [];

  return (
    <div className="min-h-screen bg-dagger-dark text-slate-200 p-4 md:p-8 font-sans relative selection:bg-dagger-fear selection:text-white pb-24">
      
      {/* Background Overlay for Focus Animation */}
      {animatingResource && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-all duration-500 pointer-events-none"></div>
      )}

      {/* --- HEADER --- */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-700 pb-4 relative z-0">
        <div className="flex items-center gap-6">
            
            {/* Avatar Column */}
            <div className="flex flex-col items-center relative group">
                <SmartAvatar 
                    ancestry={character.ancestry}
                    level={character.level}
                    className="w-24 h-24 rounded-full border-2 border-dagger-gold shadow-lg z-10 bg-slate-800"
                />
                
                {/* Domain Banners - Hanging below */}
                <div className="flex gap-1 -mt-7 z-0 pt-0">
                    {characterDomains.map(domain => {
                        const res = DOMAIN_RESOURCES[domain];
                        if (!res) return null;
                        return (
                            <div 
                                key={domain} 
                                onClick={() => handleDomainClick(domain)}
                                className={`w-10 h-20 flex items-start justify-center shadow-md ${res.colorBg} cursor-pointer hover:brightness-110 transition-all active:translate-y-0.5`} 
                                title={`Click to view ${domain} Domain info`}
                                style={{ 
                                    clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 92% 68%, 92% 10%, 90% 96%, 65% 88%, 50% 75%, 35% 88%, 15% 96%, 8% 20%, 8% 68%, 0% 60%)",
                                    paddingTop: "1.2rem"
                                }}
                            >
                                <img src={res.icon} alt={domain} className="w-11 h-11 object-contain drop-shadow-sm" style={{
                            filter: `
                            drop-shadow(1px 0 0 rgba(255, 215, 0, 0.9))
                            drop-shadow(-1px 0 0 rgba(255, 215, 0, 0.1))
                            drop-shadow(0 1px 0 rgba(255, 215, 0, 0.1))
                            drop-shadow(0 -1px 0 rgba(255, 215, 0, 0.1))
                        `
                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-2 md:mt-0">
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
          <button onClick={handleNewCharacter} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-sm font-medium">
            <FilePlusIcon /> <span className="hidden sm:inline">New</span>
          </button>

          <button onClick={loadCharacters} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all text-sm font-medium">
            <FolderIcon /> <span className="hidden sm:inline">Load</span>
          </button>
          
          <button onClick={() => setActiveModal('PROFILE')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-500 transition-all text-white text-sm font-medium">
            <EditIcon /> <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </header>

      {/* --- MAIN GRID --- */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 relative">
        
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
                    className="w-12 h-10 flex items-center justify-center bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 hover:border-dagger-hope transition-all text-lg font-bold text-sky-300"
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
            <div 
                ref={stressPanelRef}
                className={`col-span-2 glass-panel rounded-xl p-3 flex items-center justify-between px-6 relative overflow-hidden transition-all duration-500 origin-center ${animatingResource === 'stress' ? 'z-[60] scale-110 shadow-purple-500/50 shadow-2xl bg-purple-900/40 border-purple-400' : ''}`}
            >
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
             <div 
                ref={hopePanelRef}
                className={`col-span-2 glass-panel rounded-xl p-3 flex items-center justify-between px-6 relative overflow-hidden transition-all duration-500 origin-center ${animatingResource === 'hope' ? 'z-[60] scale-110 shadow-sky-500/50 shadow-2xl bg-sky-900/40 border-sky-400' : ''}`}
             >
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
                                className="text-slate-600 hover:text-red-400 p-1 opacity-50 group-hover:opacity-100 transition-opacity"
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
                        <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity z-10">
                             <button onClick={(e) => { e.stopPropagation(); requestDeleteAbility(a.id); }} className="text-slate-500 hover:text-red-400"><TrashIcon /></button>
                        </div>
                        <div className="cursor-pointer" onClick={() => handleAskAI(`Ability: ${a.name}`, a.description)}>
                            <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-bold text-dagger-gold uppercase tracking-wider flex items-center gap-1">
                                    {a.isPreset && <i className="fa-solid fa-star text-[8px]" />}
                                    {a.domain} - Lvl {a.level}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1">{a.type}</span>
                            </div>
                            <h4 className="font-bold text-slate-200 mb-1 leading-tight">{a.name}</h4>
                            <div className="text-xs text-slate-500 mb-2">{a.cost}</div>
                            <p className="text-xs text-slate-400 line-clamp-2">{a.description}</p>
                        </div>
                    </div>
                ))}
                {character.abilities.length === 0 && (
                    <div className="col-span-2 text-center text-slate-500 text-sm py-4 italic">
                        No abilities selected. Click + to add class abilities.
                    </div>
                )}
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
           <div className="glass-panel rounded-xl p-4 min-h-[400px] flex flex-col">
            
            {/* Currency Header */}
            <div 
                className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-dagger-gold/30 p-3 mb-4 cursor-pointer hover:border-dagger-gold/60 transition-all group"
                onClick={() => setActiveModal('GOLD')}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-dagger-gold uppercase tracking-widest font-bold">Wealth</span>
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors">Your Hoard &rarr;</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-slate-500 mb-1 h-6 flex items-center justify-center w-full"><ChestIcon /></div>
                        <div className="text-lg font-bold text-dagger-gold leading-none w-full">{chests}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-slate-500 mb-1 h-6 flex items-center justify-center w-full"><BagIcon /></div>
                        <div className="text-lg font-bold text-dagger-gold leading-none w-full">{bags}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-slate-500 mb-1 h-6 flex items-center justify-center w-full"><HandIcon /></div>
                        <div className="text-lg font-bold text-dagger-gold leading-none w-full">{handfuls}</div>
                    </div>
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-slate-500 mb-1 h-6 flex items-center justify-center w-full"><CoinIcon /></div>
                        <div className="text-lg font-bold text-dagger-gold leading-none w-full">{coins}</div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-2">
                    <h2 className="text-lg font-serif font-bold text-slate-300">Inventory</h2>
                    <button onClick={() => handleStaticInfo("Inventory")} className="text-slate-500 hover:text-slate-300 scale-75"><InfoIcon /></button>
                 </div>
                <div className="flex gap-2 items-center">
                    <button onClick={() => setActiveModal('INVENTORY')} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><PlusIcon /></button>
                </div>
            </div>
            <ul className="space-y-2 flex-1">
                {character.inventory.map((item, i) => (
                    <li key={i} className="text-sm text-slate-400 flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                            {item}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); requestDeleteInventory(i); }} className="text-slate-600 hover:text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"><TrashIcon /></button>
                    </li>
                ))}
            </ul>
           </div>
        </div>
      </main>

      {/* --- FLOATING STATUS INDICATORS --- */}
      
      {/* API Stats (Bottom Left) */}
      <div className="fixed bottom-4 left-4 z-40 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full px-4 py-2 text-xs text-slate-400 shadow-lg pointer-events-none">
        <span className="font-mono font-semibold text-dagger-hope">{usageStats.calls}</span> API Calls
        <span className="mx-2 opacity-50">|</span>
        <span className="font-mono font-semibold text-dagger-fear">~{usageStats.tokens}</span> Tokens Used
      </div>

      {/* Chat Widget (Bottom Right) */}
      <ChatWidget />

      {/* --- FLOATING DICE ORB --- */}
      {rollResult && (
        <>
          {showRollDetail && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
              onMouseDown={(e) => { if(e.target === e.currentTarget) backdropRef.current = e.target; }}
              onMouseUp={(e) => { 
                if(e.target === e.currentTarget && backdropRef.current === e.currentTarget) setShowRollDetail(false);
                backdropRef.current = null;
              }}
            >
              <div 
                className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden"
                onClick={(e) => e.stopPropagation()} 
              >
                <div className={`absolute inset-0 opacity-10 ${getResultBg(rollResult)}`}></div>
                
                <div className="relative z-10 text-center">
                  <h3 className={`text-2xl font-serif font-bold mb-1 ${getResultColor(rollResult)}`}>
                    {rollResult.isCrit ? "CRITICAL SUCCESS" : (rollResult.withHope ? "ROLLED WITH HOPE" : "ROLLED WITH FEAR")}
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
                  
                  {/* Success Confirmation Interaction */}
                  {rollResult.withHope && (
                    <div className="mt-6 pt-4 border-t border-slate-800">
                        <p className="text-sm text-slate-400 mb-2">Click if you succeeded</p>
                        <button 
                            onClick={handleSuccessConfirmation}
                            className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center mx-auto transition-all duration-300 ${
                                isSuccessChecked 
                                    ? 'bg-dagger-gold border-dagger-gold text-slate-900 scale-110' 
                                    : 'bg-slate-800 border-slate-600 hover:border-dagger-gold text-transparent'
                            }`}
                        >
                            <i className="fa-solid fa-check text-2xl font-bold"></i>
                        </button>
                    </div>
                  )}
                  
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
      
      {/* 1. Edit Character Sheet Modal */}
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
            character={character}
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
            onMouseDown={(e) => { if(e.target === e.currentTarget) backdropRef.current = e.target; }}
            onMouseUp={(e) => { 
                if(e.target === e.currentTarget && backdropRef.current === e.currentTarget) setActiveModal('NONE');
                backdropRef.current = null;
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
            onMouseDown={(e) => { if(e.target === e.currentTarget) backdropRef.current = e.target; }}
            onMouseUp={(e) => { 
                if(e.target === e.currentTarget && backdropRef.current === e.currentTarget) setActiveModal('NONE');
                backdropRef.current = null;
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
