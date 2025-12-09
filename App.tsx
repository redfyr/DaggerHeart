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
const SwordIcon = () => <i className="fa-solid fa-khanda text-base" />;
const SearchIcon = () => <i className="fa-solid fa-magnifying-glass text-sm" />;
const CommentIcon = () => <i className="fa-solid fa-comment-dots text-2xl" />;
const PaperPlaneIcon = () => <i className="fa-solid fa-paper-plane text-sm" />;
const ChevronDownIcon = () => <i className="fa-solid fa-chevron-down text-sm" />;
const ChevronUpIcon = () => <i className="fa-solid fa-chevron-up text-sm" />;

// Section Icons
const IdCardIcon = () => <i className="fa-solid fa-id-card text-lg" />;
const PersonRunningIcon = () => <i className="fa-solid fa-person-running text-lg" />;
const HeartPulseIcon = () => <i className="fa-solid fa-heart-pulse text-lg" />;
const ScrollIcon = () => <i className="fa-solid fa-scroll text-lg" />;

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
    const isLoading = url !== loadedUrl;

    return (
         <div className={`relative shrink-0 ${className} overflow-hidden bg-slate-800`}>
            <img 
                key={url} 
                src={url} 
                alt={ancestry}
                className="w-full h-full object-cover"
                onLoad={() => setLoadedUrl(url)} 
                onError={() => setLoadedUrl(url)} 
            />
            {isLoading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-[2px] z-10 animate-in fade-in duration-300">
                    <div className="animate-spin rounded-full h-1/3 w-1/3 border-2 border-t-transparent border-dagger-gold opacity-90"></div>
                </div>
            )}
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
interface DraggableValueProps {
    value: number; 
    onChange: (val: number) => void; 
    label: string;
    min?: number;
    max?: number;
    loop?: number;
}

const DraggableValue: React.FC<DraggableValueProps> = ({ 
    value, 
    onChange, 
    label,
    min = 0,
    max = 9999,
    loop
}) => {
    const accumulator = useRef(0);
    const lastY = useRef(0);
    const isDragging = useRef(false);
    const valueRef = useRef(value);

    // Keep ref in sync so the event listeners always see the fresh value
    useEffect(() => { valueRef.current = value; }, [value]);

    const handleStart = (clientY: number) => {
        isDragging.current = true;
        lastY.current = clientY;
        accumulator.current = 0;
        document.body.style.cursor = 'grab';
        document.body.style.overflow = 'hidden'; // Prevent scrolling on mobile
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    };

    const handleMove = (clientY: number) => {
        if (!isDragging.current) return;
        
        const delta = clientY - lastY.current; 
        lastY.current = clientY;
        accumulator.current += delta;

        const threshold = 30; // Pixels per step

        // Standard Scroll Wheel Logic: Dragging DOWN (Positive) adds value?
        // Matches "pulling lever down".
        if (Math.abs(accumulator.current) >= threshold) {
            const steps = Math.floor(accumulator.current / threshold);
            accumulator.current -= (steps * threshold);

            let newVal = valueRef.current + steps;
            
            if (loop) {
                 newVal = ((newVal % loop) + loop) % loop;
            } else {
                newVal = Math.min(max, Math.max(min, newVal));
            }

            if (newVal !== valueRef.current) {
                onChange(newVal);
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        handleStart(e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        handleStart(e.touches[0].clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault(); 
        handleMove(e.touches[0].clientY);
    };

    const handleEnd = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.overflow = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleEnd);
    };

    // --- FIX START: Wheel Handler Added Here ---
    const handleWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        
        // Scroll Up (negative delta) adds 1, Scroll Down subtracts 1
        const direction = e.deltaY < 0 ? 1 : -1;
        let newVal = valueRef.current + direction;

        if (loop) {
             newVal = ((newVal % loop) + loop) % loop;
        } else {
             newVal = Math.min(max, Math.max(min, newVal));
        }

        if (newVal !== valueRef.current) {
            onChange(newVal);
        }
    };
    // --- FIX END ---

    const nextVal = loop ? (value + 1) % loop : value + 1;
    const prevVal = loop ? (value - 1 + loop) % loop : value - 1;

    const showNext = loop ? true : nextVal <= max;
    const showPrev = loop ? true : prevVal >= min;

    return (
        <div className="flex flex-col items-center select-none w-full">
            <label className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold mb-1 tracking-wider">{label}</label>
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 border border-slate-700 w-full justify-between h-20 sm:h-24 relative overflow-hidden group hover:border-slate-500 transition-colors">
                 
                 <button 
                    onClick={() => onChange(Math.max(min, value - 1))} 
                    disabled={!loop && value <= min}
                    className="z-20 w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center text-slate-500 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <i className="fa-solid fa-minus text-xs" />
                </button>

                <div 
                    // ADDED "touch-none" below to stop mobile scrolling
                    className="flex-1 h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing relative touch-none"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onWheel={handleWheel}
                >
                    <div className="absolute top-0 w-full h-4 sm:h-6 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 w-full h-4 sm:h-6 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>

                    <div className="flex flex-col items-center justify-center gap-0 w-full">
                         <div className={`text-base font-bold text-slate-600 opacity-40 translate-y-1 ${!showNext ? 'invisible' : ''}`}>{nextVal}</div> 
                         <div className="text-2xl sm:text-4xl font-bold text-slate-100 py-0 z-0 scale-110">{value}</div>
                         <div className={`text-base font-bold text-slate-600 opacity-40 -translate-y-1 ${!showPrev ? 'invisible' : ''}`}>{prevVal}</div>
                    </div>
                </div>

                <button 
                    onClick={() => onChange(Math.min(max, value + 1))} 
                    disabled={!loop && value >= max}
                    className="z-20 w-6 sm:w-8 h-6 sm:h-8 flex items-center justify-center text-slate-500 hover:text-white bg-slate-800/50 rounded-lg hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <i className="fa-solid fa-plus text-xs" />
                </button>
            </div>
        </div>
    );
};

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
                className="fixed bottom-4 right-4 w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-dagger-gold rounded-full shadow-xl flex items-center justify-center transition-all z-40 hover:scale-110 active:scale-95"
                title="Ask Rules Bot"
            >
                <CommentIcon />
            </button>
        );
    }

    return (
        <div className="fixed bottom-20 right-4 w-72 sm:w-80 h-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5">
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

// --- Accordion Section Component ---
interface AccordionSectionProps {
    id: string; 
    title: React.ReactNode; 
    icon: React.ReactNode; 
    activeSection: string | null; 
    onToggle: (id: string) => void;
    children: React.ReactNode;
    summary?: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ 
    id, 
    title, 
    icon, 
    activeSection, 
    onToggle, 
    children,
    summary
}) => {
    const isOpen = activeSection === id;

    return (
        <div 
            className={`w-full transition-all duration-300 ease-in-out border-slate-700 overflow-hidden relative shadow-lg
                ${isOpen ? 'my-2 rounded-lg border-2 border-dagger-gold/50 bg-slate-800 z-10' : 'my-1 rounded-md border bg-slate-800/60 hover:bg-slate-700/80 hover:border-slate-500'}
            `}
            style={{
                clipPath: isOpen ? 'none' : 'polygon(0 0, 100% 0, 100% 85%, 98% 100%, 0 100%)' // Subtle cutout for closed cards
            }}
        >
            {/* Header / Mask */}
            <div 
                onClick={() => onToggle(id)}
                className={`flex items-center justify-between p-3 sm:p-4 cursor-pointer transition-colors
                    ${isOpen ? 'bg-slate-900 border-b border-slate-700' : 'bg-transparent'}
                `}
            >
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                     {/* Icon Box */}
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded bg-slate-900 border border-slate-700 shadow-inner flex-shrink-0 transition-colors ${isOpen ? 'text-dagger-gold border-dagger-gold' : 'text-slate-400'}`}>
                        {icon}
                    </div>
                    
                    {/* Title & Summary */}
                    <div className="flex flex-col min-w-0">
                        <h2 className={`font-serif font-bold tracking-wider text-sm sm:text-base truncate transition-colors ${isOpen ? 'text-dagger-gold' : 'text-slate-200'}`}>
                            {title}
                        </h2>
                        {!isOpen && summary && (
                            <div className="text-xs text-slate-400 truncate mt-0.5">{summary}</div>
                        )}
                    </div>
                </div>

                {/* Arrow */}
                <div className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon />
                </div>
            </div>

            {/* Content Body */}
            <div 
                className={`transition-all duration-300 ease-in-out bg-slate-900/40
                    ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="p-3 sm:p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- MODAL COMPONENTS ---

const DeleteConfirmModal = ({ title, message, onConfirm, onClose }: { title: string, message: string, onConfirm: () => void, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
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
                    <h3 className="font-bold text-white text-lg">Edit Profile</h3>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="p-6 overflow-y-auto dagger-scroll space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
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
                        <div className="grid grid-cols-2 gap-4 mt-4">
                             <NumberStepper label="1st Threshold" value={formData.minorThreshold} onChange={v => handleChange('minorThreshold', v)} />
                             <NumberStepper label="2nd Threshold" value={formData.majorThreshold} onChange={v => handleChange('majorThreshold', v)} />
                        </div>
                    </div>

                </div>
                <div className="p-4 border-t border-slate-700 flex justify-end gap-2 bg-slate-900/50">
                     <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                     <button onClick={() => onSave(formData)} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded hover:bg-yellow-400">Save</button>
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
            <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                    <button onClick={handleSave} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add</button>
                </div>
            </div>
        </div>
    );
};

const AddAbilityModal = ({ character, onSave, onClose }: { character: CharacterProfile, onSave: (a: AbilityCard) => void, onClose: () => void }) => {
    const [mode, setMode] = useState<'CHOICE' | 'PRESET' | 'CUSTOM'>('CHOICE');
    const [filterDomain, setFilterDomain] = useState<string>(CLASS_DOMAINS[character.class]?.[0] || DAGGERHEART_RULES.domains[0]);
    const [filterLevel, setFilterLevel] = useState<number>(character.level);
    const [selectedCard, setSelectedCard] = useState<DomainCardData | null>(null);
    const [customAbility, setCustomAbility] = useState<Partial<AbilityCard>>({
        name: "", domain: CLASS_DOMAINS[character.class]?.[0] || "Blade", cost: "1 Hope", description: "", level: 1, active: true, type: "Ability", isPreset: false
    });

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
            isPreset: true
        });
    };

    const handleSaveCustom = () => {
        if (!customAbility.name) return;
        onSave({ ...customAbility, id: generateSimpleId(), isPreset: false } as AbilityCard);
    };

    const renderChoiceScreen = () => (
        <div className="grid grid-cols-1 gap-4 p-4">
             <button 
                onClick={() => setMode('PRESET')}
                className="flex items-center p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all group gap-4"
             >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-dagger-gold text-xl shadow-lg">
                    <SearchIcon />
                </div>
                <div className="text-left">
                    <h4 className="font-bold text-white mb-1">Domain Cards</h4>
                    <p className="text-xs text-slate-400">Official Daggerheart domain decks.</p>
                </div>
             </button>

             <button 
                onClick={() => setMode('CUSTOM')}
                className="flex items-center p-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-xl transition-all group gap-4"
             >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-sky-400 text-xl shadow-lg">
                    <EditIcon />
                </div>
                <div className="text-left">
                    <h4 className="font-bold text-white mb-1">Custom Ability</h4>
                    <p className="text-xs text-slate-400">Create homebrew ability.</p>
                </div>
             </button>
        </div>
    );

    const renderPresetScreen = () => (
        <div className="flex flex-col h-full overflow-hidden">
             <div className="grid grid-cols-2 gap-2 mb-4">
                <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                     <optgroup label="Class Domains">{CLASS_DOMAINS[character.class]?.map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                     <optgroup label="All Domains">{DAGGERHEART_RULES.domains.filter(d => !CLASS_DOMAINS[character.class]?.includes(d)).map(d => <option key={d} value={d}>{d}</option>)}</optgroup>
                </select>
                <select value={filterLevel} onChange={e => setFilterLevel(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                    {Array.from({length: 10}).map((_, i) => <option key={i+1} value={i+1}>Level {i+1}</option>)}
                </select>
             </div>

             <div className="flex-1 overflow-hidden grid grid-cols-1 gap-4">
                 <div className="overflow-y-auto dagger-scroll bg-slate-900/50 rounded-lg border border-slate-700 p-2 space-y-2 max-h-40 sm:max-h-60">
                    {filteredCards.length === 0 && <div className="text-center p-4 text-slate-500 italic text-xs">No cards found.</div>}
                    {filteredCards.map(c => (
                        <div key={c.name} onClick={() => setSelectedCard(c)} className={`p-2 rounded border cursor-pointer ${selectedCard?.name === c.name ? 'bg-slate-700 border-dagger-gold' : 'bg-slate-800 border-slate-700'}`}>
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-200 text-xs">{c.name}</span>
                                <span className="text-[10px] bg-slate-900 px-1 rounded text-slate-400">Lvl {c.level}</span>
                            </div>
                        </div>
                    ))}
                 </div>

                 {selectedCard && (
                     <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 flex flex-col relative flex-1">
                        <div className="border-b border-slate-600 pb-2 mb-2">
                            <h3 className="font-bold text-lg text-white font-serif">{selectedCard.name}</h3>
                            <div className="flex flex-wrap gap-2 text-[10px] text-dagger-gold font-bold uppercase">
                                <span>{selectedCard.domain}</span><span>•</span><span>{selectedCard.type}</span><span>•</span><span>{selectedCard.cost}</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto dagger-scroll text-xs text-slate-300 leading-relaxed mb-2">
                            {selectedCard.description}
                        </div>
                        <button onClick={handleSavePreset} className="w-full py-2 bg-dagger-gold text-slate-900 font-bold rounded text-sm">Add Ability</button>
                     </div>
                 )}
             </div>
        </div>
    );

    const renderCustomScreen = () => (
        <div className="flex flex-col h-full overflow-y-auto dagger-scroll p-1">
            <div className="grid grid-cols-2 gap-2 mb-4">
                 <input placeholder="Name" value={customAbility.name} onChange={e => setCustomAbility({...customAbility, name: e.target.value})} className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                 <select value={customAbility.domain} onChange={e => setCustomAbility({...customAbility, domain: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm">
                    {DAGGERHEART_RULES.domains.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
                 <input placeholder="Level" type="number" value={customAbility.level} onChange={e => setCustomAbility({...customAbility, level: parseInt(e.target.value)})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                 <input placeholder="Type" value={customAbility.type} onChange={e => setCustomAbility({...customAbility, type: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                 <input placeholder="Cost" value={customAbility.cost} onChange={e => setCustomAbility({...customAbility, cost: e.target.value})} className="bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
            </div>
            <textarea placeholder="Description" value={customAbility.description} onChange={e => setCustomAbility({...customAbility, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-24 mb-4 text-sm" />
            <div className="mt-auto flex justify-end">
                <button onClick={handleSaveCustom} className="px-4 py-2 bg-sky-500 text-white font-bold rounded text-sm">Create</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl flex flex-col h-[500px] max-h-[90vh]">
                <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        {mode !== 'CHOICE' && <button onClick={() => setMode('CHOICE')}><BackIcon /></button>}
                        <h3 className="font-bold text-white text-base">
                            {mode === 'CHOICE' ? 'Add Ability' : (mode === 'PRESET' ? 'Select Card' : 'Custom Ability')}
                        </h3>
                    </div>
                    <button onClick={onClose}><CloseIcon /></button>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                    {mode === 'CHOICE' && renderChoiceScreen()}
                    {mode === 'PRESET' && renderPresetScreen()}
                    {mode === 'CUSTOM' && renderCustomScreen()}
                </div>
            </div>
        </div>
    );
};

const AddExperienceModal = ({ onSave, onClose }: { onSave: (exp: Experience) => void, onClose: () => void }) => {
    const [exp, setExp] = useState<Partial<Experience>>({ name: "", value: 2, description: "" });

    const handleSave = () => {
        if (!exp.name) return;
        onSave({ ...exp, id: generateSimpleId() } as Experience);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-600 shadow-2xl p-6 space-y-4">
                <h3 className="font-bold text-white text-lg">Add Experience</h3>
                <div className="space-y-3">
                    <input placeholder="Name (e.g. Ex-Soldier)" value={exp.name} onChange={e => setExp({...exp, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                    <div className="flex items-center gap-2">
                         <label className="text-slate-400 text-sm">Value:</label>
                         <input type="number" value={exp.value} onChange={e => setExp({...exp, value: parseInt(e.target.value)})} className="w-20 bg-slate-900 border border-slate-700 rounded p-2 text-white" />
                    </div>
                    <textarea placeholder="Description" value={exp.description} onChange={e => setExp({...exp, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white h-24" />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add</button>
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
                <h3 className="font-bold text-white text-lg">Add Item</h3>
                <input 
                    placeholder="Item Name" 
                    value={item} 
                    onChange={e => setItem(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                    onKeyDown={e => e.key === 'Enter' && item && onSave(item)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                    <button onClick={() => item && onSave(item)} className="px-4 py-2 bg-dagger-gold text-slate-900 font-bold rounded">Add</button>
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
  const isFirstLoad = useRef(true);
  
  // Animation Focus State
  const [animatingResource, setAnimatingResource] = useState<'hope' | 'stress' | null>(null);
  const hopePanelRef = useRef<HTMLDivElement>(null);
  const stressPanelRef = useRef<HTMLDivElement>(null);

  // Accordion State (Game UI)
  const [activeSection, setActiveSection] = useState<string | null>('status');

  // Modals state
  const [activeModal, setActiveModal] = useState<'NONE' | 'PROFILE' | 'WEAPON' | 'ABILITY' | 'CHAR_SELECT' | 'INFO_MODAL' | 'EXPERIENCE' | 'INVENTORY'>('NONE');
  const [infoModalData, setInfoModalData] = useState({ topic: '', content: '', loading: false });
  const [savedCharacters, setSavedCharacters] = useState<CharacterProfile[]>([]);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; } | null>(null);

  // Usage Stats
  const [usageStats, setUsageStats] = useState({ calls: 0, tokens: 0 });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const backdropRef = useRef<EventTarget | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToUsage((stats) => {
      setUsageStats(stats);
    });
    return () => unsubscribe();
  }, []);

useEffect(() => {
    // PREVENT AUTO-SAVE ON PAGE LOAD
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const id = await saveCharacterToDB(character);
        setSaveStatus('saved');
        if (!character.id) {
            setCharacter(prev => ({ ...prev, id }));
        }
      } catch (e) {
        console.error("Auto-save failed", e);
        setSaveStatus('idle');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [character]);

  const handleRoll = async (traitName: string, modifier: number) => {
    const hopeDie = Math.floor(Math.random() * 12) + 1;
    const fearDie = Math.floor(Math.random() * 12) + 1;
    const total = hopeDie + fearDie + modifier;
    const isCrit = hopeDie === fearDie;
    const withHope = hopeDie >= fearDie;
    
    setRollResult({ hopeDie, fearDie, total, isCrit, withHope, withFear: !withHope });
    setIsSuccessChecked(false);
    setShowRollDetail(true);
  };

  const handleSuccessConfirmation = () => {
    if (!rollResult) return;
    setIsSuccessChecked(true);
    setTimeout(() => {
        setShowRollDetail(false);
        setIsSuccessChecked(false);
        if (rollResult.isCrit) {
             setAnimatingResource('stress');
             setCharacter(prev => ({ ...prev, stress: Math.max(0, prev.stress - 1) }));
             setActiveSection('status'); // Ensure Status tab is open to see animation
             setTimeout(() => stressPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        } else {
             setAnimatingResource('hope');
             setCharacter(prev => ({ ...prev, hope: Math.min(prev.maxHope, prev.hope + 1) }));
             setActiveSection('status'); // Ensure Status tab is open to see animation
             setTimeout(() => hopePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        }
        setTimeout(() => setAnimatingResource(null), 1500);
    }, 400);
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
      setCharacter({ ...BLANK_CHARACTER });
      setActiveModal('NONE');
  };

  const handleUpdateProfile = (formData: Partial<CharacterProfile>) => {
    setCharacter(prev => {
        const updatedChar = { ...prev, ...formData };
        if (formData.class || formData.level) {
            const validDomains = CLASS_DOMAINS[updatedChar.class] || [];
            const currentLevel = updatedChar.level;
            const validAbilities = updatedChar.abilities.filter(ability => {
                if (ability.isPreset) {
                    if (validDomains.includes(ability.domain)) {
                        return ability.level <= currentLevel;
                    }
                    return false;
                }
                return ability.level <= currentLevel;
            });
            return { ...updatedChar, abilities: validAbilities };
        }
        return updatedChar;
    });
    setActiveModal('NONE');
  };

  const handleAddWeapon = (weapon: Weapon) => { setCharacter(prev => ({ ...prev, weapons: [...prev.weapons, weapon] })); setActiveModal('NONE'); };
  const handleAddAbility = (ability: AbilityCard) => { setCharacter(prev => ({ ...prev, abilities: [...prev.abilities, ability] })); setActiveModal('NONE'); };
  const handleAddExperience = (exp: Experience) => { setCharacter(prev => ({ ...prev, experiences: [...prev.experiences, exp] })); setActiveModal('NONE'); };
  const handleAddInventory = (item: string) => { if (item) setCharacter(prev => ({ ...prev, inventory: [...prev.inventory, item] })); setActiveModal('NONE'); };
  
  const handleUpdateCurrency = (type: 'gold' | 'handfuls' | 'bags' | 'chests', value: number) => {
      setCharacter(prev => {
          const newState = { ...prev, [type]: value };

          // Cascading Wealth Logic: If smaller currency hits 10, reset and increment next tier.
          if (newState.gold >= 10) {
              const overflow = Math.floor(newState.gold / 10);
              newState.gold = newState.gold % 10;
              newState.handfuls = (newState.handfuls || 0) + overflow;
          }
          if (newState.handfuls >= 10) {
              const overflow = Math.floor(newState.handfuls / 10);
              newState.handfuls = newState.handfuls % 10;
              newState.bags = (newState.bags || 0) + overflow;
          }
          if (newState.bags >= 10) {
              const overflow = Math.floor(newState.bags / 10);
              newState.bags = newState.bags % 10;
              newState.chests = (newState.chests || 0) + overflow;
          }

          return newState;
      });
  };

  const handleDomainClick = (domain: string) => {
    const info = DOMAIN_DESCRIPTIONS[domain];
    if (info) {
        setInfoModalData({ topic: `${domain} Domain`, content: `**Core Theme:**\n${info.description}\n\n**Associated Classes:**\n${info.classes}`, loading: false });
        setActiveModal('INFO_MODAL');
    }
  };

  const requestDeleteWeapon = (id: string) => { setDeleteModal({ isOpen: true, title: "Delete Weapon", message: "Remove this weapon?", onConfirm: () => { setCharacter(prev => ({ ...prev, weapons: prev.weapons.filter(w => w.id !== id) })); setDeleteModal(null); } }); };
  const requestDeleteAbility = (id: string) => { setDeleteModal({ isOpen: true, title: "Delete Ability", message: "Remove this ability?", onConfirm: () => { setCharacter(prev => ({ ...prev, abilities: prev.abilities.filter(a => a.id !== id) })); setDeleteModal(null); } }); };
  const requestDeleteExperience = (index: number) => { setDeleteModal({ isOpen: true, title: "Forget Experience", message: "Remove this tag?", onConfirm: () => { setCharacter(prev => ({ ...prev, experiences: prev.experiences.filter((_, i) => i !== index) })); setDeleteModal(null); } }); };
  const requestDeleteInventory = (index: number) => { setDeleteModal({ isOpen: true, title: "Remove Item", message: "Remove from inventory?", onConfirm: () => { setCharacter(prev => ({ ...prev, inventory: prev.inventory.filter((_, i) => i !== index) })); setDeleteModal(null); } }); };
  const requestDeleteSavedChar = (id: string) => { 
    setDeleteModal({ 
        isOpen: true, 
        title: "Delete Character", 
        message: "Permanently delete?", 
        onConfirm: async () => { 
            if (id) {
                // 1. Delete from Database
                await deleteCharacterFromDB(id); 
                
                // 2. Refresh the list immediately so the UI updates
                const chars = await getAllCharacters(); 
                setSavedCharacters(chars); 
            }
            // 3. Close the modal
            setDeleteModal(null); 
        } 
    }); 
};

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

  const characterDomains = CLASS_DOMAINS[character.class] || [];
  const toggleSection = (id: string) => setActiveSection(activeSection === id ? null : id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-32 overflow-x-hidden selection:bg-dagger-fear selection:text-white">
      
      {/* Mobile Container Limit */}
      <div className="max-w-lg mx-auto relative min-h-screen bg-slate-900 shadow-2xl p-2 sm:p-4">

        {/* --- IDENTITY SECTION --- */}
        <AccordionSection 
            id="identity" 
            title="IDENTITY" 
            icon={<IdCardIcon />} 
            activeSection={activeSection} 
            onToggle={toggleSection}
            summary={`${character.name} - Lvl ${character.level} ${character.class}`}
        >
             <div className="flex flex-col items-center gap-4">
                 <div className="flex flex-col items-center relative group w-full">
                    {/* Large Avatar */}
                    <SmartAvatar 
                        ancestry={character.ancestry}
                        level={character.level}
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-xl border-2 border-dagger-gold shadow-2xl z-10 bg-slate-800"
                    />
                    
                    {/* Hanging Domain Banners */}
                    <div className="flex gap-2 -mt-3 z-0 pt-0">
                        {characterDomains.map(domain => {
                            const res = DOMAIN_RESOURCES[domain];
                            if (!res) return null;
                            return (
                                <div 
                                    key={domain} 
                                    onClick={() => handleDomainClick(domain)}
                                    className={`w-12 h-24 flex items-start justify-center shadow-md ${res.colorBg} cursor-pointer hover:brightness-110 transition-all active:translate-y-0.5`} 
                                    style={{ 
                                        clipPath: "polygon(0% 0%, 100% 0%, 100% 60%, 92% 68%, 92% 10%, 90% 96%, 65% 88%, 50% 75%, 35% 88%, 15% 96%, 8% 20%, 8% 68%, 0% 60%)",
                                        paddingTop: "1.2rem"
                                    }}
                                >
                                    <img src={res.icon} alt={domain} className="w-12 h-12 object-contain drop-shadow-sm" style={{ filter: `drop-shadow(1px 0 0 rgba(255, 215, 0, 0.9))` }} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center w-full">
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-wide">{character.name}</h1>
                    <p className="text-slate-400 text-sm">{character.ancestry} {character.class} • <span className="text-dagger-gold">{character.subclass}</span></p>
                    <p className="text-xs text-slate-500 mt-1">{character.community} Community</p>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full mt-2">
                    <button onClick={() => setActiveModal('PROFILE')} className="flex flex-col items-center justify-center p-2 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors">
                        <EditIcon /><span className="text-[10px] mt-1">EDIT</span>
                    </button>
                    <button onClick={loadCharacters} className="flex flex-col items-center justify-center p-2 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors">
                        <FolderIcon /><span className="text-[10px] mt-1">LOAD</span>
                    </button>
                    <button onClick={handleNewCharacter} className="flex flex-col items-center justify-center p-2 bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 transition-colors">
                        <FilePlusIcon /><span className="text-[10px] mt-1">NEW</span>
                    </button>
                </div>
             </div>
        </AccordionSection>

        {/* --- ATTRIBUTES SECTION (Traits) --- */}
        <AccordionSection
            id="attributes"
            title="ATTRIBUTES"
            icon={<PersonRunningIcon />}
            activeSection={activeSection}
            onToggle={toggleSection}
            summary="Traits & Evasion"
        >
             <div className="space-y-4">
                 <div className="grid grid-cols-1 gap-2">
                     {character.traits.map((trait) => (
                        <div key={trait.name} className="flex items-center justify-between bg-slate-900/50 p-2 rounded border border-slate-700/50">
                            <div className="flex items-center gap-2" onClick={() => handleStaticInfo(trait.name)}>
                                <InfoIcon />
                                <span className="font-semibold text-slate-300 text-sm">{trait.name}</span>
                            </div>
                            <button 
                                onClick={() => handleRoll(trait.name, trait.value)}
                                className="w-10 h-8 flex items-center justify-center bg-slate-800 border border-slate-600 rounded hover:bg-slate-700 hover:border-dagger-hope transition-all font-bold text-sky-300 text-sm"
                            >
                                {trait.value >= 0 ? `+${trait.value}` : trait.value}
                            </button>
                        </div>
                     ))}
                 </div>
                 
                 <div className="flex items-center justify-between bg-slate-800 p-3 rounded border border-slate-600">
                    <div className="flex items-center gap-2">
                        <h2 className="font-serif font-bold text-slate-300 text-sm">Evasion</h2>
                        <button onClick={() => handleStaticInfo("Evasion")} className="text-slate-500 scale-75"><InfoIcon /></button>
                    </div>
                    <span className="text-2xl font-bold text-white">{character.evasion}</span>
                 </div>
                 <p className="text-[10px] text-slate-500 text-center italic">Tap value to roll.</p>
             </div>
        </AccordionSection>

        {/* --- STATUS SECTION (Vitals) --- */}
        <AccordionSection
            id="status"
            title={
  <>
    STATUS <span style={{ opacity: 0 }}>text for bars longer</span>
  </>
}
            icon={<HeartPulseIcon />}
            activeSection={activeSection}
            onToggle={toggleSection}
            summary={
                <div className="flex gap-2 mt-1">
                     <div className="h-2.5 flex-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${(character.hp / MAX_HP) * 100}%`}}></div></div>
                     <div className="h-2.5 flex-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-purple-500" style={{width: `${(character.stress / character.maxStress) * 100}%`}}></div></div>
                     <div className="h-2.5 flex-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-slate-500" style={{width: `${(character.armor / character.maxArmor) * 100}%`}}></div></div>
                     <div className="h-2.5 flex-1 bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${(character.hope / character.maxHope) * 100}%`}}></div></div>
                </div>
            }
        >
            <div className="space-y-4">
                 {/* Damage & Armor Grid */}
                 <div className="grid grid-cols-2 gap-3">
                     {/* Damage */}
                     <div className="bg-slate-900/50 rounded-lg p-2 border border-red-900/30 flex flex-col items-center">
                         <div className="flex items-center gap-1 mb-1">
                             <span className="text-[10px] uppercase text-red-400 font-bold">Damage</span>
                             <button onClick={() => handleStaticInfo("Damage")} className="scale-75 text-slate-500"><InfoIcon /></button>
                         </div>
                         <div className="flex items-center justify-center gap-2 mb-2 mt-1 px-3 py-1 bg-slate-800/40 rounded-lg border border-slate-700/30">
                             <span className="text-lg font-bold text-slate-200">{character.minorThreshold}</span>
                             <span className="text-slate-500 text-sm font-light">/</span>
                             <span className="text-lg font-bold text-slate-200">{character.majorThreshold}</span>
                         </div>
                         <div className="text-4xl font-bold text-white mb-2">{character.hp}</div>
                         <div className="flex flex-wrap justify-center gap-1">
                             {Array.from({length: MAX_HP}).map((_, i) => (
                                <button key={i} onClick={() => setCharacter(c => ({...c, hp: i + 1 === c.hp ? i : i + 1}))} className={`w-6 h-6 rounded-full border border-red-500 ${i < character.hp ? 'bg-red-500' : 'bg-transparent'}`} />
                             ))}
                         </div>
                     </div>

                     {/* Armor */}
                     <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700 flex flex-col items-center">
                         <div className="flex items-center gap-1 mb-1">
                             <span className="text-[10px] uppercase text-slate-400 font-bold">Armor Slots</span>
                             <button onClick={() => handleStaticInfo("Armor")} className="scale-75 text-slate-500"><InfoIcon /></button>
                         </div>
                         <div className="h-[29px] mb-2"></div> {/* Spacer */}
                         <div className="text-4xl font-bold text-white mb-2">{character.armor}</div>
                         <div className="flex flex-wrap justify-center gap-1">
                             {Array.from({length: character.maxArmor}).map((_, i) => (
                                <button key={i} onClick={() => setCharacter(c => ({...c, armor: i + 1 === c.armor ? i : i + 1}))} className={`w-6 h-6 rounded-full border border-slate-400 ${i < character.armor ? 'bg-slate-400' : 'bg-transparent'}`} />
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Stress */}
                 <div ref={stressPanelRef} className={`bg-slate-900/50 rounded-lg p-3 border border-purple-900/30 transition-all duration-500 ${animatingResource === 'stress' ? 'ring-2 ring-purple-500 scale-105 bg-purple-900/20' : ''}`}>
                     <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                             <span className="text-xs uppercase text-purple-400 font-bold">Stress</span>
                             <button onClick={() => handleStaticInfo("Stress")} className="scale-75 text-slate-500"><InfoIcon /></button>
                         </div>
                         <span className="text-lg font-bold text-purple-500">{character.stress}</span>
                     </div>
                     <div className="flex gap-1.5 flex-wrap">
                         {Array.from({length: character.maxStress}).map((_, i) => (
                            <button key={i} onClick={() => setCharacter(c => ({...c, stress: i + 1 === c.stress ? i : i + 1}))} className={`w-5 h-5 rounded-full border border-purple-500 ${i < character.stress ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-transparent'}`} />
                         ))}
                     </div>
                 </div>

                 {/* Hope */}
                 <div ref={hopePanelRef} className={`bg-slate-900/50 rounded-lg p-3 border border-sky-900/30 transition-all duration-500 ${animatingResource === 'hope' ? 'ring-2 ring-dagger-hope scale-105 bg-sky-900/20' : ''}`}>
                     <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-2">
                             <span className="text-xs uppercase text-dagger-hope font-bold">Hope</span>
                             <button onClick={() => handleStaticInfo("Hope")} className="scale-75 text-slate-500"><InfoIcon /></button>
                         </div>
                         <span className="text-lg font-bold text-dagger-hope">{character.hope}</span>
                     </div>
                     <div className="flex gap-1.5 flex-wrap">
                         {Array.from({length: character.maxHope}).map((_, i) => (
                            <button key={i} onClick={() => setCharacter(c => ({...c, hope: i + 1 === c.hope ? i : i + 1}))} className={`w-5 h-5 rounded-full border border-dagger-hope ${i < character.hope ? 'bg-dagger-hope shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'bg-transparent'}`} />
                         ))}
                     </div>
                 </div>
            </div>
        </AccordionSection>

        {/* --- ARSENAL SECTION (Weapons) --- */}
        <AccordionSection
            id="combat"
            title="ARSENAL"
            icon={<SwordIcon />}
            activeSection={activeSection}
            onToggle={toggleSection}
            summary={`${character.weapons.length} Equipped`}
        >
             <div className="space-y-3">
                 {character.weapons.map((w) => (
                    <div key={w.id} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center group relative overflow-hidden">
                        <div className="flex items-start gap-3 z-10">
                            <div className="mt-1 text-slate-500 text-sm"><SwordIcon /></div>
                            <div>
                                <h4 className="font-bold text-slate-200 text-sm">{w.name}</h4>
                                <p className="text-[10px] text-slate-400">{w.type} • {w.range} • <span className="text-slate-200">{w.damage}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-2 z-10">
                             <button onClick={() => handleAskAI(`Weapon: ${w.name}`, w.description)} className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">AI Info</button>
                             <button onClick={(e) => { e.stopPropagation(); requestDeleteWeapon(w.id); }} className="text-slate-600 hover:text-red-400 p-1"><TrashIcon /></button>
                        </div>
                    </div>
                 ))}
                 <button onClick={() => setActiveModal('WEAPON')} className="w-full py-2 bg-slate-800 border border-slate-600 border-dashed rounded text-slate-400 text-xs hover:text-white hover:border-solid hover:bg-slate-700 transition-all">
                     <PlusIcon /> Add Weapon
                 </button>
             </div>
        </AccordionSection>

        {/* --- GRIMOIRE SECTION (Abilities) --- */}
        <AccordionSection
            id="abilities"
            title="GRIMOIRE"
            icon={<ScrollIcon />}
            activeSection={activeSection}
            onToggle={toggleSection}
            summary={`${character.abilities.length} Abilities`}
        >
             <div className="grid grid-cols-1 gap-3">
                {character.abilities.map(a => (
                    <div key={a.id} className="bg-slate-900 p-3 rounded border border-slate-700 relative" onClick={() => handleAskAI(`Ability: ${a.name}`, a.description)}>
                        <div className="flex justify-between mb-1">
                             <span className="text-[9px] font-bold text-dagger-gold uppercase flex items-center gap-1">{a.isPreset && <i className="fa-solid fa-star text-[8px]" />}{a.domain} {a.level}</span>
                             <span className="text-[9px] text-slate-500">{a.cost}</span>
                        </div>
                        <h4 className="font-bold text-slate-200 text-sm mb-1">{a.name}</h4>
                        <p className="text-[10px] text-slate-400 line-clamp-2">{a.description}</p>
                        <button onClick={(e) => { e.stopPropagation(); requestDeleteAbility(a.id); }} className="absolute bottom-2 right-2 text-slate-600 hover:text-red-400"><TrashIcon /></button>
                    </div>
                ))}
                <button onClick={() => setActiveModal('ABILITY')} className="w-full py-2 bg-slate-800 border border-slate-600 border-dashed rounded text-slate-400 text-xs hover:text-white hover:border-solid hover:bg-slate-700 transition-all">
                     <PlusIcon /> Add Ability
                </button>
             </div>
        </AccordionSection>

        {/* --- EQUIPMENT SECTION (Inventory) --- */}
        <AccordionSection
            id="inventory"
            title="EQUIPMENT"
            icon={<BagIcon />}
            activeSection={activeSection}
            onToggle={toggleSection}
            summary={`${character.gold} Coins • ${character.inventory.length} Items`}
        >
            <div className="space-y-4">
                 {/* Gold */}
                 <div className="bg-slate-900/40 p-3 rounded-lg border border-dagger-gold/20">
                    <div className="flex items-center gap-2 mb-3 border-b border-dagger-gold/10 pb-2 px-1">
                        <CoinIcon />
                        <h4 className="font-bold text-dagger-gold text-xs tracking-widest">WEALTH</h4>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2">
                        <DraggableValue label="Coins" value={character.gold} onChange={(v) => handleUpdateCurrency('gold', v)} max={10} />
                        <DraggableValue label="Handfuls" value={character.handfuls || 0} onChange={(v) => handleUpdateCurrency('handfuls', v)} max={10} />
                        <DraggableValue label="Bags" value={character.bags || 0} onChange={(v) => handleUpdateCurrency('bags', v)} max={10} />
                        <DraggableValue label="Chests" value={character.chests || 0} onChange={(v) => handleUpdateCurrency('chests', v)} />
                    </div>
                 </div>

                 {/* Experiences */}
                 <div>
                     <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                         <h4 className="text-xs font-bold text-slate-400">EXPERIENCES</h4>
                         <button onClick={() => setActiveModal('EXPERIENCE')} className="text-slate-500 text-xs hover:text-white"><PlusIcon /></button>
                     </div>
                     <div className="space-y-1">
                        {character.experiences.map((e, i) => (
                            <div key={e.id || i} className="flex justify-between items-center p-2 bg-slate-900/50 rounded border border-slate-700/50">
                                <span className="text-xs text-slate-300">{e.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-dagger-hope">+{e.value}</span>
                                    <button onClick={(ev) => { ev.stopPropagation(); requestDeleteExperience(i); }} className="text-slate-600 hover:text-red-400"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>

                 {/* Items */}
                 <div>
                     <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-1">
                         <h4 className="text-xs font-bold text-slate-400">INVENTORY</h4>
                         <button onClick={() => setActiveModal('INVENTORY')} className="text-slate-500 text-xs hover:text-white"><PlusIcon /></button>
                     </div>
                     <ul className="space-y-1">
                        {character.inventory.map((item, i) => (
                            <li key={i} className="text-xs text-slate-400 flex items-center justify-between p-1">
                                <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-slate-600"></span>{item}</div>
                                <button onClick={(e) => { e.stopPropagation(); requestDeleteInventory(i); }} className="text-slate-600 hover:text-red-400"><TrashIcon /></button>
                            </li>
                        ))}
                     </ul>
                 </div>
            </div>
        </AccordionSection>

      </div>
      
      {/* --- FLOATING WIDGETS --- */}

      {/* Dice Result Overlay */}
      {rollResult && showRollDetail && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onMouseDown={(e) => { if(e.target === e.currentTarget) backdropRef.current = e.target; }}
            onMouseUp={(e) => { if(e.target === e.currentTarget && backdropRef.current === e.currentTarget) setShowRollDetail(false); backdropRef.current = null; }}
        >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden text-center" onClick={(e) => e.stopPropagation()}>
                <div className={`absolute inset-0 opacity-10 ${getResultBg(rollResult)}`}></div>
                <h3 className={`relative text-xl font-serif font-bold mb-4 ${getResultColor(rollResult)}`}>{rollResult.isCrit ? "CRITICAL!" : (rollResult.withHope ? "HOPE" : "FEAR")}</h3>
                <div className="relative text-6xl font-bold text-white mb-6 drop-shadow-xl">{rollResult.total}</div>
                <div className="relative flex justify-center gap-8 mb-6">
                    <div className="text-center"><div className="text-[10px] uppercase text-dagger-hope mb-1">Hope</div><div className={`text-2xl font-bold ${rollResult.withHope ? 'text-dagger-hope' : 'text-slate-600'}`}>{rollResult.hopeDie}</div></div>
                    <div className="text-center"><div className="text-[10px] uppercase text-dagger-fear mb-1">Fear</div><div className={`text-2xl font-bold ${!rollResult.withHope ? 'text-dagger-fear' : 'text-slate-600'}`}>{rollResult.fearDie}</div></div>
                </div>
                {rollResult.withHope && (
                    <button onClick={handleSuccessConfirmation} className={`relative w-16 h-16 rounded-xl border-2 flex items-center justify-center mx-auto transition-all ${isSuccessChecked ? 'bg-dagger-gold border-dagger-gold text-slate-900 scale-110' : 'bg-slate-800 border-slate-600 hover:border-dagger-gold text-slate-600 hover:text-dagger-gold'}`}>
                        <CheckIcon />
                    </button>
                )}
            </div>
        </div>
      )}

      {/* Floating Dice Button (Minimized) */}
      {rollResult && !showRollDetail && (
        <button
            onClick={() => setShowRollDetail(true)}
            className={`fixed bottom-4 left-4 w-12 h-12 rounded-full shadow-2xl border-2 flex items-center justify-center z-40 transition-transform hover:scale-110 active:scale-95 bg-slate-900 ${getResultColor(rollResult)}`}
        >
            <span className="text-lg font-bold">{rollResult.total}</span>
        </button>
      )}

      {/* Chat Bot */}
      <ChatWidget />
      
      {/* Usage Stats (Mini) */}
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-30 text-[9px] text-slate-600 pointer-events-none opacity-50">
        API: {usageStats.calls} | Tokens: {usageStats.tokens}
      </div>

      {/* --- MODALS --- */}
      {activeModal === 'PROFILE' && <EditCharacterModal character={character} onSave={handleUpdateProfile} onClose={() => setActiveModal('NONE')} />}
      {activeModal === 'WEAPON' && <AddWeaponModal onSave={handleAddWeapon} onClose={() => setActiveModal('NONE')} />}
      {activeModal === 'ABILITY' && <AddAbilityModal character={character} onSave={handleAddAbility} onClose={() => setActiveModal('NONE')} />}
      {activeModal === 'EXPERIENCE' && <AddExperienceModal onSave={handleAddExperience} onClose={() => setActiveModal('NONE')} />}
      {activeModal === 'INVENTORY' && <AddInventoryModal onSave={handleAddInventory} onClose={() => setActiveModal('NONE')} />}
      
      {/* Info Modal */}
      {activeModal === 'INFO_MODAL' && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onMouseDown={(e) => { if(e.target === e.currentTarget) backdropRef.current = e.target; }}
            onMouseUp={(e) => { if(e.target === e.currentTarget && backdropRef.current === e.currentTarget) setActiveModal('NONE'); backdropRef.current = null; }}
        >
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-600 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-base text-dagger-gold flex items-center gap-2"><InfoIcon /> {infoModalData.topic}</h3>
              <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-white"><CloseIcon /></button>
            </div>
            <div className="p-4 overflow-y-auto dagger-scroll">
              {infoModalData.loading ? <div className="space-y-2 animate-pulse"><div className="h-2 bg-slate-700 rounded w-3/4"></div><div className="h-2 bg-slate-700 rounded w-full"></div></div> : <MarkdownText content={infoModalData.content} />}
            </div>
          </div>
        </div>
      )}

      {/* Char Select Modal */}
      {activeModal === 'CHAR_SELECT' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setActiveModal('NONE')}>
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-600 shadow-2xl p-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-white mb-2">Load Character</h3>
            <div className="max-h-60 overflow-y-auto dagger-scroll space-y-2">
              {savedCharacters.length === 0 && <p className="text-slate-500 text-xs italic text-center">No saves.</p>}
              {savedCharacters.map(char => (
                <div key={char.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded hover:bg-slate-700">
                  <div onClick={() => { setCharacter(char); setActiveModal('NONE'); }} className="cursor-pointer flex-1">
                    <div className="font-bold text-white text-sm">{char.name}</div>
                    <div className="text-[10px] text-slate-400">{char.class} Lvl {char.level}</div>
                  </div>
                  <button onClick={() => requestDeleteSavedChar(char.id!)} className="text-red-400 p-2"><TrashIcon /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteModal && <DeleteConfirmModal title={deleteModal.title} message={deleteModal.message} onConfirm={deleteModal.onConfirm} onClose={() => setDeleteModal(null)} />}
    </div>
  );
}
