import React, { useState, useRef, useEffect } from 'react';
import CompareSlider from './components/CompareSlider';
import Chat from './components/Chat';
import { generateEditedImage, sendChatMessage } from './services/geminiService';
import { AppState, ChatMessage, DesignStyle } from './types';
import { v4 as uuidv4 } from 'uuid'; 

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 9);

const STYLES: DesignStyle[] = [
  { id: 'scandi', name: 'Scandinavian', prompt: 'Redesign this room in a Scandinavian style. Bright, airy, minimalist, light wood furniture, neutral colors, cozy textures.', thumbnailColor: 'bg-stone-100' },
  { id: 'mcm', name: 'Mid-Century', prompt: 'Redesign this room in Mid-Century Modern style. Teak wood, organic curves, tapered legs, olive greens and mustard yellows, retro aesthetic.', thumbnailColor: 'bg-amber-100' },
  { id: 'industrial', name: 'Industrial', prompt: 'Redesign this room in Industrial style. Exposed brick, metal accents, concrete textures, leather furniture, raw and edgy look.', thumbnailColor: 'bg-slate-300' },
  { id: 'boho', name: 'Bohemian', prompt: 'Redesign this room in Bohemian style. Eclectic patterns, many plants, rattan furniture, macrame, warm earth tones, relaxed atmosphere.', thumbnailColor: 'bg-orange-100' },
  { id: 'japandi', name: 'Japandi', prompt: 'Redesign this room in Japandi style. Fusion of Japanese and Scandinavian. Clean lines, functional, warm minimalism, natural materials.', thumbnailColor: 'bg-amber-50' },
];

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Helper to add new image to history
  const addToHistory = (newImage: string) => {
    // If we are in the middle of history, truncate the future
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImage);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentImage(newImage);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentImage(history[newIndex]);
    }
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setOriginalImage(result);
      setCurrentImage(result); // Initially, current is original
      
      // Init History
      setHistory([result]);
      setHistoryIndex(0);
      
      setAppState(AppState.EDITOR);
      
      // Initial greeting
      setMessages([{
        id: generateId(),
        role: 'model',
        text: "I've analyzed your room! Select a style above to reimagine it, or use the 'Edit Room' input to make specific changes.",
        timestamp: new Date()
      }]);
    };
    reader.readAsDataURL(file);
  };

  // 1. Generate New Style
  const handleStyleSelect = async (style: DesignStyle) => {
    if (!originalImage || isGenerating) return;

    setIsGenerating(true);
    try {
      const generated = await generateEditedImage(originalImage, style.prompt);
      addToHistory(generated);
      // Notify chat
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        text: `Here is the ${style.name} version of your room! Use the slider to compare.`,
        timestamp: new Date()
      }]);
    } catch (error) {
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Specific Edit (Refine Design)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentImage || !editPrompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      // We use the CURRENT image as the base for edits to stack changes
      const generated = await generateEditedImage(currentImage, editPrompt);
      addToHistory(generated);
      setEditPrompt('');
    } catch (error) {
      alert("Failed to edit image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Chat (Q&A + Shopping)
  const handleSendMessage = async (text: string) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsChatLoading(true);

    try {
      // Pass current image context if available
      const response = await sendChatMessage(messages, text, currentImage || undefined);
      
      const botMessage: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: response.text,
        sources: response.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-primary to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              D
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">DesignGenius</h1>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Dark Mode Toggle */}
             <button
               onClick={() => setDarkMode(!darkMode)}
               className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
               aria-label="Toggle Dark Mode"
             >
               {darkMode ? (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                 </svg>
               ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                 </svg>
               )}
             </button>

            {appState === AppState.EDITOR && (
               <button 
                 onClick={() => {
                   setAppState(AppState.UPLOAD);
                   setOriginalImage(null);
                   setCurrentImage(null);
                   setMessages([]);
                   setHistory([]);
                   setHistoryIndex(-1);
                 }}
                 className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-sm"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                 </svg>
                 Upload New Photo
               </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {appState === AppState.UPLOAD && (
          <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl text-center space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
                  Redesign your room in seconds.
                </h2>
                <p className="text-xl text-gray-500 dark:text-gray-400">
                  Upload a photo to explore styles, refine details with AI, and find matching furniture instantly.
                </p>
              </div>

              <div className="mt-8">
                <label className="group relative flex flex-col items-center justify-center w-full h-64 border-3 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl cursor-pointer bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-primary dark:hover:border-primary hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="p-4 bg-primary/5 dark:bg-primary/20 rounded-full mb-4 group-hover:bg-primary/10 dark:group-hover:bg-primary/30 transition-colors">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary">Click to upload room photo</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">SVG, PNG, JPG or GIF</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.EDITOR && originalImage && currentImage && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            
            {/* Left Column: Editor & Styles (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
              
              {/* Style Selector Carousel */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 ml-1">Reimagine Style</h3>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => handleStyleSelect(style)}
                      disabled={isGenerating}
                      className="flex-shrink-0 flex flex-col items-center group relative w-24"
                    >
                      <div className={`w-24 h-16 ${style.thumbnailColor} rounded-lg mb-2 shadow-sm group-hover:shadow-md transition-all flex items-center justify-center overflow-hidden`}>
                         {/* Placeholder pattern for style */}
                         <div className="opacity-20 font-bold text-2xl text-black">{style.name[0]}</div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary dark:group-hover:text-primary transition-colors">{style.name}</span>
                      {isGenerating && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compare Slider Area */}
              <div className="relative group rounded-xl overflow-hidden shadow-2xl ring-1 ring-gray-900/5 bg-gray-900">
                <CompareSlider 
                  original={originalImage} 
                  modified={currentImage} 
                  className="bg-gray-800"
                />
                
                {isGenerating && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
                    <svg className="animate-spin h-10 w-10 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-medium text-lg animate-pulse">Designing your room...</p>
                  </div>
                )}
              </div>

              {/* Edit Input (Refine) */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                 <div className="flex justify-between items-center mb-3">
                   <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Refine Design</h3>
                   <div className="flex space-x-2">
                     <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0 || isGenerating}
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Undo"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                       </svg>
                     </button>
                     <button
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1 || isGenerating}
                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        title="Redo"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
                       </svg>
                     </button>
                   </div>
                 </div>
                 <form onSubmit={handleEditSubmit} className="flex gap-3">
                   <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <input 
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g., Make the rug blue, add a plant in the corner..."
                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                      />
                   </div>
                   <button 
                     type="submit"
                     disabled={isGenerating || !editPrompt.trim()}
                     className="bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                   >
                     Apply Edit
                   </button>
                 </form>
                 <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Powered by Gemini 2.5 Flash Image. Describe the change you want to see.</p>
              </div>

            </div>

            {/* Right Column: Chat Interface (4 Cols) */}
            <div className="lg:col-span-4 h-full min-h-[500px] flex flex-col">
              <div className="sticky top-24 h-[calc(100vh-8rem)]">
                <Chat 
                  messages={messages} 
                  onSendMessage={handleSendMessage} 
                  isLoading={isChatLoading} 
                />
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;