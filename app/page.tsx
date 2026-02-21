"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";

type Note = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
};

type OSTheme = "system7" | "aqua" | "win98" | "winxp";

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Note formulation
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef({ title: "", content: "", id: null as string | null });
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "gallery">("list");
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // OS Theme
  const [theme, setTheme] = useState<OSTheme>("aqua");
  const [showSettings, setShowSettings] = useState(false);

  // Audio synths
  const synthsRef = useRef<any>({});
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  const initAudioAndPlay = async (soundFn: () => void) => {
    try {
      let Tone;
      if (!isAudioInitialized) {
        Tone = await import("tone");
        await Tone.start();
        
        synthsRef.current = {
          sys7Theme: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "square" },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 1.5 }
          }).toDestination(),
          win98Theme: new Tone.PolySynth(Tone.FMSynth).toDestination(),
          winxpTheme: new Tone.PolySynth(Tone.AMSynth).toDestination(),
          aquaTheme: new Tone.MembraneSynth().toDestination(),
          
          sys7Click: new Tone.Synth({
            oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.01 }
          }).toDestination(),
          win98Click: new Tone.Synth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.05 }
          }).toDestination(),
          winxpClick: new Tone.MembraneSynth().toDestination(),
          aquaClick: new Tone.PluckSynth().toDestination(),
          
          trash: new Tone.NoiseSynth({
            noise: { type: "brown" },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0, release: 0.2 }
          }).toDestination(),
          
          type: new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.01, sustain: 0, release: 0.01 }
          }).toDestination()
        };

        // Set volumes
        synthsRef.current.sys7Theme.volume.value = -12;
        synthsRef.current.win98Theme.volume.value = -10;
        synthsRef.current.winxpTheme.volume.value = -8;
        synthsRef.current.aquaTheme.volume.value = -5;
        
        synthsRef.current.sys7Click.volume.value = -15;
        synthsRef.current.win98Click.volume.value = -20;
        synthsRef.current.winxpClick.volume.value = -15;
        synthsRef.current.aquaClick.volume.value = -15;
        
        synthsRef.current.trash.volume.value = -10;
        synthsRef.current.type.volume.value = -25;
        
        setIsAudioInitialized(true);
      }
      soundFn();
    } catch(e) { console.error("Audio init failed", e) }
  };

  const playThemeSwitchSound = (newTheme: OSTheme) => {
    initAudioAndPlay(() => {
      const synths = synthsRef.current;
      if (!synths || !synths.sys7Theme) return;
      
      if (newTheme === 'system7') synths.sys7Theme.triggerAttackRelease(["C4", "E4", "G4", "C5"], "0.5");
      else if (newTheme === 'win98') synths.win98Theme.triggerAttackRelease(["Eb4", "G4", "Bb4", "Eb5"], "1.5");
      else if (newTheme === 'winxp') synths.winxpTheme.triggerAttackRelease(["Eb5", "Bb4", "Eb4", "Ab4"], "1.0");
      else if (newTheme === 'aqua') synths.aquaTheme.triggerAttackRelease("C6", "8n");
    });
  };

  const playClick = () => {
    initAudioAndPlay(() => {
      const synths = synthsRef.current;
      if (!synths || !synths.sys7Click) return;

      if (theme === 'system7') synths.sys7Click.triggerAttackRelease("C5", "32n");
      else if (theme === 'win98') synths.win98Click.triggerAttackRelease("G4", "32n");
      else if (theme === 'winxp') synths.winxpClick.triggerAttackRelease("C4", "32n");
      else if (theme === 'aqua') synths.aquaClick.triggerAttackRelease("C5", "32n");
    });
  };

  const playDelete = () => {
    initAudioAndPlay(() => {
      const synths = synthsRef.current;
      if (synths && synths.trash) synths.trash.triggerAttackRelease("8n");
    });
  };

  const playType = () => {
    initAudioAndPlay(() => {
      const synths = synthsRef.current;
      if (synths && synths.type) synths.type.triggerAttackRelease("64n");
    });
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      playType();
    },
  });

  // Fetch notes
  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.notes) {
        if (data.notes.length === 0) {
          const welcomeNotes = [
            {
              title: "Welcome to raw",
              content: "Hey there, Gen Z mode on. >.<",
            },
            {
              title: "Quick Tip",
              content: "Tap the toolbar to format, checklist, or add images. >.<",
            },
          ];
          const created = await Promise.all(
            welcomeNotes.map((note) =>
              fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(note),
              }).then((r) => r.json())
            )
          );
          const createdNotes = created
            .map((r) => r.note)
            .filter(Boolean);
          setNotes(createdNotes);
        } else {
          setNotes(data.notes);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewNote = () => {
    playClick();
    setSelectedNoteId(null);
    setTitle("");
    setContent("");
    lastSavedRef.current = { title: "", content: "", id: null };
    editor?.commands.setContent("");
  };

  const selectNote = (note: Note) => {
    playClick();
    setSelectedNoteId(note._id);
    setTitle(note.title);
    setContent(note.content || "");
    editor?.commands.setContent(note.content || "", { emitUpdate: false });
    lastSavedRef.current = {
      title: note.title || "",
      content: note.content || "",
      id: note._id,
    };
  };

  const saveNote = async () => {
    if (!title) return;
    
    try {
      const isUpdating = Boolean(selectedNoteId);
      const res = await fetch(
        isUpdating ? `/api/notes/${selectedNoteId}` : "/api/notes",
        {
          method: isUpdating ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content }),
        }
      );
      const data = await res.json();
      if (data.note) {
        if (isUpdating) {
          setNotes((prev) =>
            prev.map((note) => (note._id === data.note._id ? data.note : note))
          );
        } else {
          setNotes((prev) => [data.note, ...prev]);
        }
        setSelectedNoteId(data.note._id);
        lastSavedRef.current = {
          title: data.note.title || "",
          content: data.note.content || "",
          id: data.note._id,
        };
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const deleteSelectedNote = async () => {
    if (!selectedNoteId) {
      setStatusMessage("Select a note to delete.");
      return;
    }

    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(selectedNoteId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setStatusMessage(errorData.error || "Failed to delete note.");
        return;
      }

      setNotes((prev) => {
        const remaining = prev.filter((note) => note._id !== selectedNoteId);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSelectedNoteId(next._id);
          setTitle(next.title);
          setContent(next.content || "");
          lastSavedRef.current = {
            title: next.title || "",
            content: next.content || "",
            id: next._id,
          };
        } else {
          setSelectedNoteId(null);
          setTitle("");
          setContent("");
          lastSavedRef.current = { title: "", content: "", id: null };
        }
        return remaining;
      });
      setStatusMessage("Note deleted.");
    } catch (error) {
      console.error("Failed to delete note:", error);
      setStatusMessage("Failed to delete note.");
    }
  };

  useEffect(() => {
    if (!title) return;
    const id = selectedNoteId;
    const last = lastSavedRef.current;
    const hasChanges = title !== last.title || content !== last.content || id !== last.id;
    if (!hasChanges) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveNote();
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, selectedNoteId]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const previewText = (html: string) =>
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const filteredNotes = notes.filter((note) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (note.title || "").toLowerCase().includes(q) ||
      previewText(note.content || "").toLowerCase().includes(q)
    );
  });

  const groupNotesByDate = (list: Note[]) => {
    const now = new Date();
    const groups: Record<string, Note[]> = {};

    const toStartOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = (d: Date) => {
      const ms = toStartOfDay(now) - toStartOfDay(d);
      return Math.floor(ms / (1000 * 60 * 60 * 24));
    };

    list.forEach((note) => {
      const created = new Date(note.createdAt);
      const days = diffDays(created);
      let label = "";

      if (days <= 30) {
        label = "Previous 30 Days";
      } else {
        const month = created.toLocaleString("default", { month: "long" });
        label = `${month} ${created.getFullYear()}`;
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(note);
    });

    return groups;
  };

  const groupedNotes = groupNotesByDate(filteredNotes);

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        editor?.chain().focus().setImage({ src: result }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  const themeConfig = {
    aqua: {
      bg: "bg-white",
      text: "text-[#333]",
      border: "border-[#8a8a8a]",
      titleBar: "bg-gradient-to-b from-[#f4f5f5] via-[#d6d6d6] to-[#c2c2c2] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] h-[22px]",
      toolbar: "bg-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.1)] min-h-[44px]",
      toolbarPinstripes: "repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2px)",
      button: "bg-gradient-to-b from-[#fdfdfd] to-[#dcdcdc] border border-[#9e9e9e] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_1px_1px_rgba(0,0,0,0.1)] active:bg-gradient-to-b active:from-[#dcdcdc] active:to-[#fdfdfd] active:shadow-inner rounded text-[#666]",
      sidebar: "bg-[#fdfdfd]",
      selectedNote: "bg-gradient-to-b from-[#6094de] to-[#457ad1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
      noteItem: "hover:bg-[#f5f5f5]",
      input: "bg-transparent",
    },
    system7: {
      bg: "bg-white",
      text: "text-black",
      border: "border-black",
      titleBar: "bg-white border-b border-black h-[20px] shadow-[0_1px_0_black]",
      toolbar: "bg-white border-b border-black min-h-[40px]",
      toolbarPinstripes: "none",
      button: "bg-white border border-black shadow-[1px_1px_0_black] active:translate-y-px active:shadow-none rounded-none text-black",
      sidebar: "bg-white",
      selectedNote: "bg-black text-white",
      noteItem: "hover:bg-gray-200 border-b border-black",
      input: "bg-white border border-black",
    },
    win98: {
      bg: "bg-[#c0c0c0]",
      text: "text-black",
      border: "border-[#808080]",
      titleBar: "bg-gradient-to-r from-[#000080] to-[#1084d0] h-[24px] text-white font-bold tracking-wide",
      toolbar: "bg-[#c0c0c0] border-b border-[#fff] shadow-[0_1px_0_#808080] min-h-[40px]",
      toolbarPinstripes: "none",
      button: "bg-[#c0c0c0] border-t border-l border-[#fff] border-r border-b border-[#808080] shadow-[1px_1px_0_#000] active:border-t-[#808080] active:border-l-[#808080] active:border-r-[#fff] active:border-b-[#fff] active:shadow-none active:translate-y-[1px] active:translate-x-[1px] rounded-none text-black",
      sidebar: "bg-white border-inset border-2 border-[#808080] shadow-[inset_1px_1px_0_#000,1px_1px_0_#fff]",
      selectedNote: "bg-[#000080] text-white",
      noteItem: "hover:bg-gray-100",
      input: "bg-white border-inset border-2 border-[#808080] shadow-[inset_1px_1px_0_#000,1px_1px_0_#fff]",
    },
    winxp: {
      bg: "bg-[#ece9d8]",
      text: "text-black",
      border: "border-[#0054e3]",
      titleBar: "bg-gradient-to-b from-[#0058e6] via-[#3a93ff] to-[#0058e6] h-[30px] text-white font-bold shadow-[0_1px_2px_rgba(0,0,0,0.5)] rounded-t-lg",
      toolbar: "bg-gradient-to-b from-[#f9f8f6] to-[#dcd9ce] border-b border-[#d0caba] min-h-[44px]",
      toolbarPinstripes: "none",
      button: "bg-transparent hover:bg-white hover:border-[#316ac5] hover:shadow-[0_1px_1px_rgba(0,0,0,0.1)] active:bg-[#e3e1d6] border border-transparent rounded text-black transition-colors",
      sidebar: "bg-white border-r border-[#8f8f8f]",
      selectedNote: "bg-[#316ac5] text-white",
      noteItem: "hover:bg-[#f3f8fd] hover:border-[#d9e8fa]",
      input: "bg-white border border-[#7f9db9]",
    }
  };

  const t = themeConfig[theme];

  return (
    <div className={`h-screen w-screen flex flex-col font-sans select-none overflow-hidden bg-transparent ${t.text}`}>
      
      {/* Dynamic Theme Styles for the Editor Elements */}
      <style dangerouslySetInnerHTML={{__html: `
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
          background: ${theme === 'winxp' ? '#fff' : theme === 'system7' ? '#fff' : theme === 'win98' ? '#fff' : 'transparent'};
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: ${theme === 'system7' ? '2px solid black' : theme === 'win98' ? '1px solid #808080' : theme === 'winxp' ? '1px solid #d0d0d0' : '1px solid #d1d1d6'};
          padding: 6px 10px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: ${theme === 'system7' ? 'black' : theme === 'win98' ? '#c0c0c0' : theme === 'winxp' ? '#ece9d8' : 'rgba(0, 0, 0, 0.05)'};
          color: ${theme === 'system7' ? 'white' : 'inherit'};
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: ${theme === 'system7' ? 'rgba(0,0,0,0.3)' : 'rgba(200, 200, 255, 0.4)'};
          pointer-events: none;
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: ${theme === 'system7' ? 'black' : '#adf'};
          pointer-events: none;
        }
        .ProseMirror p { margin-bottom: 0.5rem; }
      `}} />

      {/* Main App Window */}
      <div className={`flex-1 flex flex-col shadow-2xl ${t.bg} border-0 overflow-hidden relative z-10`}>
        
        {/* Title Bar */}
        <div className={`${t.titleBar} flex items-center justify-between px-2 relative`}>
          
          {theme === 'aqua' && (
            <>
              <div className="flex gap-[7px] ml-1">
                <div className="w-[11px] h-[11px] rounded-full bg-gradient-to-b from-[#ff5f57] to-[#e0443e] border border-[#ce3630] shadow-inner"></div>
                <div className="w-[11px] h-[11px] rounded-full bg-gradient-to-b from-[#ffbd2e] to-[#dea123] border border-[#d69818] shadow-inner"></div>
                <div className="w-[11px] h-[11px] rounded-full bg-gradient-to-b from-[#28c940] to-[#1aab29] border border-[#169d23] shadow-inner"></div>
              </div>
              <div className="font-bold text-[#333333] text-[13px] tracking-wide absolute left-1/2 -translate-x-1/2" style={{ textShadow: "0 1px 0 rgba(255,255,255,0.8)"}}>raw</div>
              <div className="w-10 h-[14px] rounded-full border border-[#999] bg-[#d9d9d9] flex items-center justify-center mr-1 shadow-inner opacity-60">
                <div className="w-6 h-[2px] bg-[#aaa] rounded-full"></div>
              </div>
            </>
          )}

          {theme === 'system7' && (
            <>
              <div className="w-[12px] h-[12px] border border-black bg-white flex items-center justify-center"></div>
              <div className="flex-1 h-3 mx-2" style={{ background: "repeating-linear-gradient(to bottom, transparent, transparent 1px, black 1px, black 2px)" }}></div>
              <div className="font-bold px-2 bg-white">raw</div>
              <div className="flex-1 h-3 mx-2" style={{ background: "repeating-linear-gradient(to bottom, transparent, transparent 1px, black 1px, black 2px)" }}></div>
              <div className="w-[12px] h-[12px] border border-black bg-white flex items-center justify-center"><div className="w-1.5 h-1.5 border border-black"></div></div>
            </>
          )}

          {theme === 'win98' && (
            <>
              <div className="flex items-center gap-1 font-bold text-[12px]">
                <span className="text-[14px]">📝</span> raw
              </div>
              <div className="flex gap-1">
                <div className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-[#fff] border-r border-b border-[#808080] shadow-[1px_1px_0_#000] text-black flex items-center justify-center font-bold text-[10px]">_</div>
                <div className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-[#fff] border-r border-b border-[#808080] shadow-[1px_1px_0_#000] text-black flex items-center justify-center font-bold text-[10px]">□</div>
                <div className="w-4 h-4 bg-[#c0c0c0] border-t border-l border-[#fff] border-r border-b border-[#808080] shadow-[1px_1px_0_#000] text-black flex items-center justify-center font-bold text-[10px]">×</div>
              </div>
            </>
          )}

          {theme === 'winxp' && (
            <>
              <div className="flex items-center gap-1 font-bold text-[13px] text-white" style={{ textShadow: "1px 1px 2px black" }}>
                <span className="text-[16px]">📝</span> raw
              </div>
              <div className="flex gap-[2px]">
                <div className="w-6 h-6 rounded-sm bg-gradient-to-b from-[#5c96f2] to-[#205fd6] border border-[#fff] border-opacity-40 flex items-center justify-center text-white text-lg hover:brightness-110 cursor-pointer shadow-sm pb-2">_</div>
                <div className="w-6 h-6 rounded-sm bg-gradient-to-b from-[#5c96f2] to-[#205fd6] border border-[#fff] border-opacity-40 flex items-center justify-center text-white text-lg hover:brightness-110 cursor-pointer shadow-sm pb-1">□</div>
                <div className="w-6 h-6 rounded-sm bg-gradient-to-b from-[#eb6a58] to-[#ce432e] border border-[#fff] border-opacity-40 flex items-center justify-center text-white text-lg hover:brightness-110 cursor-pointer shadow-sm pb-1">×</div>
              </div>
            </>
          )}

        </div>

        {/* Toolbar */}
        <div className={`${t.toolbar} flex relative z-20 w-full`}>
          {theme === 'aqua' && <div className="absolute inset-0 pointer-events-none" style={{ background: t.toolbarPinstripes }}></div>}
          
          <div className="flex flex-wrap items-center justify-between w-full px-2 py-1.5 gap-y-2">
            {/* Left Icons */}
            <div className="flex items-center gap-1 md:gap-2 relative z-10 mr-4">
              {/* Mobile Back Button */}
              <div 
                onClick={() => {
                  playClick();
                  setSelectedNoteId(null);
                }} 
                className={`w-[28px] h-[24px] md:hidden flex items-center justify-center cursor-pointer ${!selectedNoteId ? 'opacity-50 pointer-events-none' : ''} ${t.button}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </div>

              <div onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`w-[28px] h-[24px] hidden md:flex items-center justify-center cursor-pointer ${t.button}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
              </div>
              <div onClick={() => setViewMode(v => v === "list" ? "gallery" : "list")} className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer ${t.button}`}>
                {viewMode === "list" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                )}
              </div>
              <div
                onClick={deleteSelectedNote}
                className={`w-[28px] h-[24px] flex items-center justify-center ${selectedNoteId ? "cursor-pointer" : "opacity-50 cursor-not-allowed"} ${t.button}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex flex-wrap items-center gap-1 relative z-10">
              <div onClick={handleNewNote} className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer mr-2 ${t.button}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </div>

              <div
                onClick={() => setShowFormatMenu((prev) => !prev)}
                className={`relative w-[28px] h-[24px] flex items-center justify-center cursor-pointer ${t.button} font-serif font-bold text-[11px] leading-none`}
              >
                Aa
                {showFormatMenu && (
                  <div className="absolute top-[28px] left-0 z-20 bg-white border border-[#bdbdbd] rounded-md shadow-md px-2 py-1 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor?.chain().focus().toggleBold().run();
                      }}
                      className={`text-[12px] font-bold ${editor?.isActive("bold") ? "text-[#2f6dd1]" : "text-[#555]"}`}
                    >
                      B
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor?.chain().focus().toggleItalic().run();
                      }}
                      className={`text-[12px] italic ${editor?.isActive("italic") ? "text-[#2f6dd1]" : "text-[#555]"}`}
                    >
                      I
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editor?.chain().focus().toggleStrike().run();
                      }}
                      className={`text-[12px] line-through ${editor?.isActive("strike") ? "text-[#2f6dd1]" : "text-[#555]"}`}
                    >
                      S
                    </button>
                  </div>
                )}
              </div>

              <div
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
                className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer ${t.button}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>

              <div
                onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer ${t.button}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer mr-2 ${t.button}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              
              <div className="flex items-center bg-white border border-[#9e9e9e] px-2 py-0.5 shadow-inner w-[100px] md:w-[140px] h-[22px] mr-1 md:mr-2 flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" className="mr-1.5 flex-shrink-0"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[11px] text-[#333] w-full min-w-0"
                />
              </div>

              {/* Settings / Theme Switcher */}
              <div className="relative">
                <div onClick={() => setShowSettings(!showSettings)} className={`w-[28px] h-[24px] flex items-center justify-center cursor-pointer ${t.button}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
                
                {showSettings && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-[#9e9e9e] shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded z-50">
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b border-[#e5e5e5] bg-gray-50 rounded-t">
                      UI Theme
                    </div>
                    <div className="py-1">
                      {(["aqua", "system7", "win98", "winxp"] as OSTheme[]).map((os) => (
                        <div
                          key={os}
                          onClick={() => {
                            setTheme(os);
                            playThemeSwitchSound(os);
                            setShowSettings(false);
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-blue-50 hover:text-blue-600 ${theme === os ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                        >
                          <span>{os.toUpperCase()}</span>
                          {theme === os && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar */}
          <div className={`${t.sidebar} md:border-r ${t.border} overflow-y-auto transition-all duration-150 ${isSidebarCollapsed ? "hidden md:flex md:w-0 md:min-w-0 md:max-w-0 md:opacity-0 md:pointer-events-none" : "w-full md:w-1/3 md:min-w-[200px] md:max-w-[300px]"} ${selectedNoteId ? 'hidden md:flex' : 'flex'} flex-col`}>
            {loading ? (
              <div className="p-4 text-[#8e8e93] text-sm">Loading...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-4 text-[#8e8e93] text-sm">No notes found.</div>
            ) : (
              <div className={viewMode === "list" ? "flex flex-col" : "flex flex-col gap-2 p-2"}>
                {Object.entries(groupedNotes).map(([label, group]) => (
                  <div key={label}>
                    <div className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wide ${theme === 'system7' ? 'text-black border-y border-black bg-gray-100' : 'text-[#8e8e93]'}`}>
                      {label}
                    </div>
                    {viewMode === "gallery" ? (
                      <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                        {group.map((note) => {
                          const isSelected = selectedNoteId === note._id;
                          return (
                            <div
                              key={note._id}
                              onClick={() => selectNote(note)}
                              className={`h-[92px] p-3 border cursor-pointer flex flex-col justify-between ${theme === 'win98' ? 'border-[#808080]' : theme === 'system7' ? 'border-black' : 'border-[#e5e5e5] rounded-md'} ${isSelected ? t.selectedNote : t.noteItem}`}
                            >
                              <div className={`font-bold truncate text-[13px] leading-tight ${theme === 'aqua' && isSelected ? 'text-white' : ''}`}>
                                {note.title || "Untitled Note"}
                              </div>
                              <div className={`text-[11px] line-clamp-3 opacity-80`}>
                                {previewText(note.content || "") || "No additional text"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {group.map((note) => {
                          const isSelected = selectedNoteId === note._id;
                          return (
                            <div 
                              key={note._id}
                              onClick={() => selectNote(note)}
                              className={`h-[68px] px-4 py-3 cursor-pointer flex flex-col justify-center ${theme === 'system7' ? 'border-b border-black' : 'border-b border-[#e5e5e5]'} ${isSelected ? t.selectedNote : t.noteItem}`}
                            >
                              <div className={`font-bold truncate text-[14px] leading-tight ${theme === 'aqua' && isSelected ? 'text-white' : ''}`}>
                                {note.title || "Untitled Note"}
                              </div>
                              <div className={`text-[12px] truncate mt-1 opacity-70`}>
                                {formatDate(note.createdAt)} - {previewText(note.content || "") || "No additional text"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className={`${t.bg} flex-1 p-4 md:p-8 relative flex-col overflow-hidden ${!selectedNoteId ? 'hidden md:flex' : 'flex'}`}>
            <input 
              type="text"
              placeholder="Note Title"
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                playType();
              }}
              className={`text-[24px] md:text-[32px] font-bold border-none outline-none ${theme === 'system7' || theme === 'win98' || theme === 'winxp' ? 'text-black' : 'text-[#333333]'} placeholder-[#d1d1d6] mb-2 md:mb-4 bg-transparent`}
            />
            <EditorContent
              editor={editor}
              className={`tiptap flex-1 overflow-y-auto text-[16px] ${theme === 'system7' || theme === 'win98' || theme === 'winxp' ? 'text-black' : 'text-[#333333]'} leading-relaxed bg-transparent`}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.currentTarget.value = "";
              }}
            />
            
            {/* Status Indicator */}
            <div className="absolute bottom-8 right-8 text-xs opacity-50 font-bold">
              {statusMessage || (title || content ? 'Autosaved' : '')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
