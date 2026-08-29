'use client';

import React, { useState, Suspense, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useApp, simulatedReplies } from '@/context/AppContext';
import Avatar from '@/components/common/Avatar';
import EmptyState from '@/components/common/EmptyState';
import {
  Hash,
  Send,
  Image as ImageIcon,
  Smile,
  Paperclip,
  MessageSquare,
  Search,
  Lock,
  Users,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';

interface ChatMessage {
  id: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  content: string;
  timestamp: string;
}

// --- TAB: Community Channels ---
function ChannelsTab() {
  const { currentUser, pushNotification } = useApp();

  const channels = [
    { id: 'general', name: 'general-discussions', description: 'Global hub chatter, announcements, and quick questions.' },
    { id: 'ai-lab', name: 'ai-lab-cohort-2026', description: 'Discussions related to Machine Learning and regional agricultural AI models.' },
    { id: 'iot-sandbox', name: 'iot-hardware-sandbox', description: 'Embedded systems, microcontrollers, PCB etching, and 3D printing.' },
    { id: 'dallas-hub', name: 'dallas-entrepreneurs', description: 'Dallas-Port Harcourt venture scalability and mentorship pairing.' }
  ];

  const [activeChannelId, setActiveChannelId] = useState('general');
  const [typedMessage, setTypedMessage] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyCountRef = useRef<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CHAT_EMOJIS = ['👍', '🙌', '🔥', '🚀', '🎉', '😀', '😎', '🤖', '💡', '🌱', '✅', '🙏'];

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAttachment(f.name);
    e.target.value = '';
  };

  const [channelMessages, setChannelMessages] = useState<{ [channelId: string]: ChatMessage[] }>({
    'general': [
      {
        id: 'msg-1',
        senderName: 'David Miller',
        senderAvatar: '/avatars/david_m.png',
        senderRole: 'Staff',
        content: "Hi everyone! Friendly reminder that the 3D printers in the Hardware Sandbox should be cleaned after use. Let's keep the hub tidy! 🦾",
        timestamp: '10:15 AM'
      },
      {
        id: 'msg-2',
        senderName: 'Elena Rostova',
        senderAvatar: '/avatars/elena.png',
        senderRole: 'Admin',
        content: 'Thanks, David! Also, a quick heads up: RSVP lists for the Smart City IoT Hackathon close this Friday. Make sure to lock your teams in!',
        timestamp: '10:20 AM'
      },
      {
        id: 'msg-3',
        senderName: 'Sarah Jenkins',
        senderAvatar: '/avatars/sarah.png',
        senderRole: 'Member',
        content: 'Elena, is it fine if we form hybrid teams with members attending from the Dallas Hub virtually? 🌐',
        timestamp: '10:45 AM'
      },
      {
        id: 'msg-4',
        senderName: 'Elena Rostova',
        senderAvatar: '/avatars/elena.png',
        senderRole: 'Admin',
        content: 'Absolutely! That is highly encouraged. In fact, David Wilson has volunteered to coordinate the Dallas virtual teams. Get in touch with him!',
        timestamp: '11:00 AM'
      }
    ],
    'ai-lab': [
      {
        id: 'msg-al-1',
        senderName: 'Sarah Jenkins',
        senderAvatar: '/avatars/sarah.png',
        senderRole: 'Member',
        content: 'Hey cohort! Has anyone experimented with running quantized Llama-3 models on Raspberry Pi 5? Trying to optimize local latency.',
        timestamp: 'Yesterday'
      },
      {
        id: 'msg-al-2',
        senderName: 'Elena Rostova',
        senderAvatar: '/avatars/elena.png',
        senderRole: 'Admin',
        content: 'I believe David Miller has set up a couple of accelerated Raspberry Pi boards in the Sandbox last week. They have active cooling which might help with thermal throttling during execution.',
        timestamp: 'Yesterday'
      }
    ],
    'iot-sandbox': [
      {
        id: 'msg-iot-1',
        senderName: 'David Miller',
        senderAvatar: '/avatars/david_m.png',
        senderRole: 'Staff',
        content: 'Just restocked the solder reels and copper boards. Ready for the hackathon prep classes tomorrow!',
        timestamp: '2 days ago'
      }
    ],
    'dallas-hub': [
      {
        id: 'msg-dl-1',
        senderName: 'David Wilson',
        senderAvatar: '/avatars/david_w.png',
        senderRole: 'Alumni',
        content: 'Hey PH Family! Dallas mentorship office hours are open on Thursday. Looking forward to talking about SaaS growth strategies!',
        timestamp: '3 days ago'
      }
    ]
  });

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const activeMessages = channelMessages[activeChannelId] || [];
  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(channelFilter.toLowerCase()) ||
    c.description.toLowerCase().includes(channelFilter.toLowerCase())
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() && !attachment) return;

    const content = attachment
      ? `📎 ${attachment}${typedMessage.trim() ? `\n${typedMessage}` : ''}`
      : typedMessage;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: 'You',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    setChannelMessages(prev => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg]
    }));

    setTypedMessage('');
    setAttachment(null);
    setShowEmoji(false);

    // Trigger simulated bot reply
    const config = simulatedReplies[activeChannelId];
    if (config) {
      setTimeout(() => setIsTyping(true), 900);
      setTimeout(() => {
        setIsTyping(false);
        const idx = replyCountRef.current[activeChannelId] || 0;
        const replyText = config.replies[idx % config.replies.length];
        replyCountRef.current[activeChannelId] = idx + 1;

        const replyMsg: ChatMessage = {
          id: `reply-${Date.now()}`,
          senderName: config.senderName,
          senderAvatar: config.senderAvatar,
          senderRole: config.senderRole,
          content: replyText,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };

        setChannelMessages(prev => ({
          ...prev,
          [activeChannelId]: [...(prev[activeChannelId] || []), replyMsg]
        }));

        pushNotification({
          type: 'message',
          title: `New message in #${activeChannel?.name}`,
          body: `${config.senderName}: "${replyText.slice(0, 60)}..."`,
          avatar: config.senderAvatar,
          link: '/messages?tab=channels'
        });
      }, 2400);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isTyping]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-[65vh] md:h-[calc(100vh-13rem)] flex overflow-hidden">
      
      {/* Channels Sidebar */}
      <aside className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-64 border-r border-gray-200 flex-col shrink-0 bg-gray-50/50`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">DISCUSSIONS</span>
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 mt-2.5">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              placeholder="Filter channels..."
              className="bg-transparent border-none text-[10.5px] text-brand-black focus:ring-0 focus:outline-none w-full ml-1 font-semibold"
            />
          </div>
        </div>

        {/* Channel list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredChannels.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              No matching channels
            </div>
          ) : (
            filteredChannels.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveChannelId(c.id);
                  if (window.innerWidth < 768) setShowSidebar(false);
                }}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-colors gap-2.5 ${
                  activeChannelId === c.id
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/10 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 bg-gray-100/30 text-center">
          <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider block">Live discussion feeds</span>
          <span className="text-[10px] text-brand-blue font-bold flex items-center justify-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></span>
            Real-time active
          </span>
        </div>

      </aside>

      {/* Chat Area */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-white`}>
        {activeChannel ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 md:px-6 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden text-gray-400 hover:text-gray-600 shrink-0"
                  aria-label="Back to channels"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-gray-900 truncate">#{activeChannel.name}</h3>
                  <p className="text-[10px] text-gray-400 font-medium truncate">{activeChannel.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full shrink-0">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>4 Active</span>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {activeMessages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title={`No messages in #${activeChannel.name} yet`}
                  description="Be the first to post a message or question in this channel!"
                />
              ) : (
                activeMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3.5 max-w-3xl">
                    <Avatar
                      src={msg.senderAvatar}
                      name={msg.senderName}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900 truncate">{msg.senderName}</span>
                        <span className="text-[8.5px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-bold">
                          {msg.senderRole}
                        </span>
                        <span className="text-[9.5px] text-gray-400 leading-none">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3 leading-relaxed font-medium whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex items-center gap-3">
                  <Avatar
                    src={simulatedReplies[activeChannelId]?.senderAvatar}
                    name={simulatedReplies[activeChannelId]?.senderName}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold">
                    {simulatedReplies[activeChannelId]?.senderName} is typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 shrink-0">
              {showEmoji && (
                <div className="mb-2 flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
                  {CHAT_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setTypedMessage(prev => prev + em)}
                      className="w-7 h-7 rounded-md hover:bg-gray-100 text-base flex items-center justify-center transition-colors"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {attachment && (
                <div className="mb-2 inline-flex items-center gap-2 bg-brand-blue/5 border border-brand-blue/15 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-brand-blue">
                  <Paperclip className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[180px]">{attachment}</span>
                  <button type="button" onClick={() => setAttachment(null)} className="text-brand-blue/60 hover:text-brand-blue shrink-0">✕</button>
                </div>
              )}

              <input type="file" ref={fileInputRef} onChange={handleAttach} className="hidden" />

              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-gray-400 shrink-0 mr-3">
                  <button
                    type="button"
                    onClick={() => { fileInputRef.current?.removeAttribute('accept'); fileInputRef.current?.click(); }}
                    className="hover:text-brand-blue transition-colors p-1"
                    title="Attach Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}
                    className="hover:text-brand-blue transition-colors p-1"
                    title="Upload Image"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                    className={`hover:text-brand-blue transition-colors p-1 ${showEmoji ? 'text-brand-blue' : ''}`}
                    title="Insert Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="w-full bg-transparent border-none text-xs text-brand-black focus:ring-0 focus:outline-none p-1 placeholder-gray-400 font-semibold"
                />

                <button
                  type="submit"
                  disabled={!typedMessage.trim() && !attachment}
                  className="ml-2 text-brand-blue hover:text-blue-600 disabled:opacity-40 shrink-0 font-bold text-xs flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50 text-brand-blue" />
            <p className="text-xs font-semibold">Select a discussion channel from the sidebar to chat.</p>
          </div>
        )}

      </div>
    </div>
  );
}

// --- TAB: Private DMs ---
function DMsTab({ initialUserId }: { initialUserId?: string | null }) {
  const { currentUser, profiles } = useApp();

  // Seeded from the ?user= deep link (the "Send DM" button on a profile) so the
  // intended conversation opens instead of an arbitrary first contact.
  const [selectedContact, setSelectedContact] = useState<string | null>(initialUserId ?? null);
  const [draftMessage, setDraftMessage] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [dmMessages, setDmMessages] = useState<{ [contactId: string]: ChatMessage[] }>({});
  const [showSidebar, setShowSidebar] = useState(true);

  // Everyone messageable — independent of the sidebar search box.
  const allContacts = profiles.filter(p => p.id !== currentUser.id);

  // Search narrows only what the sidebar LISTS, never which thread is open.
  const dmContacts = allContacts.filter(p =>
    p.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    p.role.toLowerCase().includes(contactSearch.toLowerCase()) ||
    p.department.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Resolve against the UNFILTERED list: this previously read from dmContacts, so
  // typing a search that excluded the open contact silently switched the thread.
  const contact = allContacts.find(p => p.id === selectedContact) || allContacts[0];
  const activeMessages = contact ? (dmMessages[contact.id] || []) : [];

  const handleSendDM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftMessage.trim() || !contact) return;

    const newMsg: ChatMessage = {
      id: `dm-${Date.now()}`,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: 'You',
      content: draftMessage.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    setDmMessages(prev => ({
      ...prev,
      [contact.id]: [...(prev[contact.id] || []), newMsg]
    }));
    setDraftMessage('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm h-[65vh] md:h-[calc(100vh-13rem)] flex overflow-hidden">

      {/* DM Contacts Sidebar */}
      <aside className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-64 border-r border-gray-200 flex-col shrink-0 bg-gray-50/50`}>

        <div className="p-4 border-b border-gray-200">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-widest">DIRECT MESSAGES</span>
          <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 mt-2.5">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Search members..."
              className="bg-transparent border-none text-[10.5px] text-brand-black focus:ring-0 focus:outline-none w-full ml-1 font-semibold"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {dmContacts.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              No matching members
            </div>
          ) : (
            dmContacts.map((p) => {
              const isSelected = contact?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedContact(p.id); if (window.innerWidth < 768) setShowSidebar(false); }}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-bold transition-colors gap-3 ${
                    isSelected
                      ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Avatar src={p.avatar} name={p.name} size="sm" className="shrink-0" />
                  <div className="text-left truncate flex-1 min-w-0">
                    <p className="font-bold text-gray-900 leading-tight truncate">{p.name}</p>
                    <p className="text-[9px] text-gray-400 font-semibold capitalize truncate">{p.role} · {p.department}</p>
                  </div>
                </button>
              );
            })
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 bg-gray-100/30 text-center">
          <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider block">End-to-end encrypted</span>
          <span className="text-[10px] text-brand-green font-bold flex items-center justify-center gap-1 mt-1">
            <Lock className="w-2.5 h-2.5" />
            Private DMs
          </span>
        </div>

      </aside>

      {/* DM Chat Area */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 bg-white`}>
        {contact ? (
          <>
            {/* DM Header */}
            <div className="h-16 px-4 md:px-6 border-b border-gray-200 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-gray-400 hover:text-gray-600 shrink-0"
                aria-label="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar src={contact.avatar} name={contact.name} size="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm text-gray-900 truncate">{contact.name}</h3>
                <p className="text-[10px] text-gray-400 font-medium capitalize truncate">{contact.role} · {contact.department}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {activeMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-center py-16">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-40 text-brand-blue" />
                  <p className="text-xs font-semibold">Start a private conversation with {contact.name}</p>
                  <p className="text-[10px] text-gray-400 mt-1">Direct messages are confidential and securely logged.</p>
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 max-w-2xl ml-auto flex-row-reverse">
                    <Avatar
                      src={msg.senderAvatar}
                      name={msg.senderName}
                      size="sm"
                      className="shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-white bg-brand-blue rounded-xl p-3 leading-relaxed font-medium break-words shadow-sm">
                        {msg.content}
                      </p>
                      <span className="text-[9px] text-gray-400 block text-right pr-1">{msg.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* DM Input */}
            <form onSubmit={handleSendDM} className="p-4 border-t border-gray-200 shrink-0">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  placeholder={`Send ${contact.name} a private message...`}
                  className="w-full bg-transparent border-none text-xs text-brand-black focus:ring-0 focus:outline-none p-1 placeholder-gray-400 font-semibold"
                />

                <button
                  type="submit"
                  disabled={!draftMessage.trim()}
                  className="ml-2 text-brand-blue hover:text-blue-600 disabled:opacity-40 shrink-0 font-bold text-xs flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50 text-brand-blue" />
            <p className="text-xs font-semibold">Select a member to start a private conversation.</p>
          </div>
        )}
      </div>

    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'channels';
  // Target member for a DM deep link: /messages?tab=dms&user=<profileId>
  const targetUserId = searchParams.get('user');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">Discussions & Messages</h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time collaboration across Port Harcourt & Dallas Hubs. Coordinate technical sandboxes, ask questions, and chat privately.
          </p>
        </div>

        {tab === 'dms' ? (
          <DMsTab initialUserId={targetUserId} />
        ) : (
          <ChannelsTab />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MessagesDiscussions() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6 text-xs text-gray-500 font-semibold">
        Loading discussion hub...
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
