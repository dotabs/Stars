import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/components/auth/useAuth';
import { Button } from '@/components/ui/button';
import { canMessageProfile, getFollowState, getUserProfile, listConversations, listMessages, markConversationRead, sendDirectMessage } from '@/lib/social';
import { useToast } from '@/hooks/use-toast';

function Avatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="h-10 w-10 rounded-full object-cover" />;
  }

  return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d26d47,#9f472a)] text-sm font-bold text-white">{(name || 'U').slice(0, 2).toUpperCase()}</div>;
}

export function Messages() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get('user') ?? '';
  const [conversationState, setConversationState] = useState({ items: [], cursor: null, hasMore: false, isLoading: true });
  const [activeConversationId, setActiveConversationId] = useState('');
  const [recipientProfile, setRecipientProfile] = useState(null);
  const [messagesState, setMessagesState] = useState({ items: [], cursor: null, hasMore: false, isLoading: false });
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!currentUser?.uid) {
      setConversationState({ items: [], cursor: null, hasMore: false, isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    void listConversations(currentUser.uid)
      .then((response) => {
        if (!cancelled) {
          setConversationState({ ...response, isLoading: false });
          if (!activeConversationId && response.items[0]?.id) {
            setActiveConversationId(response.items[0].id);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load conversations', error);
        if (!cancelled) {
          setConversationState({ items: [], cursor: null, hasMore: false, isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, currentUser?.uid]);

  useEffect(() => {
    let cancelled = false;
    if (!requestedUserId || !currentUser?.uid || requestedUserId === currentUser.uid) {
      setRecipientProfile(null);
      return () => {
        cancelled = true;
      };
    }

    void getUserProfile(requestedUserId)
      .then(async (profile) => {
        if (!profile || cancelled) {
          return;
        }
        const followState = await getFollowState({ viewerId: currentUser.uid, profileUserId: requestedUserId });
        if (!cancelled && canMessageProfile(profile, { isOwner: false, isFollower: followState.isFollowing })) {
          setRecipientProfile(profile);
        }
      })
      .catch((error) => {
        console.error('Failed to load recipient profile', error);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, requestedUserId]);

  useEffect(() => {
    let cancelled = false;
    if (!activeConversationId || !currentUser?.uid) {
      setMessagesState({ items: [], cursor: null, hasMore: false, isLoading: false });
      return () => {
        cancelled = true;
      };
    }

    setMessagesState((current) => ({ ...current, isLoading: true }));
    void listMessages(activeConversationId)
      .then(async (response) => {
        if (!cancelled) {
          setMessagesState({ ...response, isLoading: false });
        }
        await markConversationRead(currentUser.uid, activeConversationId);
      })
      .catch((error) => {
        console.error('Failed to load messages', error);
        if (!cancelled) {
          setMessagesState({ items: [], cursor: null, hasMore: false, isLoading: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, currentUser?.uid]);

  const activeConversation = useMemo(() => conversationState.items.find((entry) => entry.id === activeConversationId) ?? null, [activeConversationId, conversationState.items]);

  async function handleSend() {
    if (!currentUser || !messageInput.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const nextConversationId = await sendDirectMessage({
        senderUser: currentUser,
        recipientProfile: recipientProfile ?? {
          userId: activeConversation?.counterpartId,
          username: activeConversation?.counterpartName,
          avatarUrl: activeConversation?.counterpartAvatarUrl,
        },
        text: messageInput,
      });
      setMessageInput('');
      setActiveConversationId(nextConversationId);
      const [nextConversations, nextMessages] = await Promise.all([
        listConversations(currentUser.uid),
        listMessages(nextConversationId),
      ]);
      setConversationState({ ...nextConversations, isLoading: false });
      setMessagesState({ ...nextMessages, isLoading: false });
    } catch (error) {
      console.error('Failed to send message', error);
      toast({
        title: 'Message failed',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pt-20 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="section-kicker">Inbox</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Messages</h1>
            <div className="mt-6 space-y-3">
              {conversationState.items.map((conversation) => (
                <button key={conversation.id} type="button" onClick={() => setActiveConversationId(conversation.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${activeConversationId === conversation.id ? 'border-[#d26d47]/35 bg-white/[0.06]' : 'border-white/[0.08] bg-black/20 hover:border-white/15'}`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={conversation.counterpartName || 'User'} avatarUrl={conversation.counterpartAvatarUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{conversation.counterpartName}</p>
                      <p className="mt-1 truncate text-sm text-white/55">{conversation.lastMessageText}</p>
                    </div>
                    {conversation.unreadCount > 0 ? <span className="rounded-full bg-[#d26d47] px-2 py-1 text-xs font-semibold text-white">{conversation.unreadCount}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.03] p-6">
            {activeConversation || recipientProfile ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={recipientProfile?.username || activeConversation?.counterpartName || 'User'} avatarUrl={recipientProfile?.avatarUrl || activeConversation?.counterpartAvatarUrl} />
                  <div>
                    <p className="font-medium text-white">{recipientProfile?.username || activeConversation?.counterpartName}</p>
                    <Link to={`/profile/${recipientProfile?.userId || activeConversation?.counterpartId}`} className="text-sm text-[#f4b684] hover:text-white">Open profile</Link>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {messagesState.items.slice().reverse().map((message) => (
                    <div key={message.id} className={`flex ${message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${message.senderId === currentUser?.uid ? 'bg-[#d26d47]/18 text-white' : 'bg-black/25 text-white/82'}`}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <input value={messageInput} onChange={(event) => setMessageInput(event.target.value)} placeholder="Write a message..." className="input-cinematic flex-1" />
                  <Button className="btn-primary" onClick={() => void handleSend()} disabled={isSending || !messageInput.trim()}>
                    {isSending ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex min-h-[18rem] items-center justify-center text-center text-white/55">Select a conversation or open a profile to start messaging.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
