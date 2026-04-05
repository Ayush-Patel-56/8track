import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, Clock, Info, AlertTriangle, XCircle, CheckCircle, Flame, Calendar, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import api from '../../lib/api';
import { useToast } from '../common/Toast';

const TYPE_ICONS = {
    info: <Info className="w-4 h-4 text-blue-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
    success: <CheckCircle className="w-4 h-4 text-green-400" />,
    attendance: <Check className="w-4 h-4 text-emerald-400" />,
    assignment: <Calendar className="w-4 h-4 text-purple-400" />,
    exam: <Flame className="w-4 h-4 text-orange-400" />,
    streak: <Flame className="w-4 h-4 text-orange-500" />,
};

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [lastUnreadCount, setLastUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.get('/notifications').then(r => r.data.notifications),
        refetchInterval: 5000, // Auto-sync every 5 seconds
    });

    const notifications = notificationsData || [];
    const unreadCount = notifications.filter(n => !n.read).length;

    // Play sound on new notifications
    useEffect(() => {
        if (unreadCount > lastUnreadCount) {
             const audio = new Audio(NOTIFICATION_SOUND);
             audio.volume = 0.4;
             audio.play().catch(e => console.log('Audio blocked by browser policy'));
        }
        setLastUnreadCount(unreadCount);
    }, [unreadCount, lastUnreadCount]);

    const markReadMutation = useMutation({
        mutationFn: (id) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => api.patch('/notifications/read-all'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            showToast('All notifications marked as read', 'success');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/notifications/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-xl transition-all hover:bg-[var(--active-highlight)] ${isOpen ? 'text-white bg-[var(--active-highlight)]' : 'text-[var(--text-muted)] hover:text-white'}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--main-bg)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-3xl overflow-hidden glass shadow-2xl z-[100] border border-[var(--active-highlight)]"
                    style={{ background: 'rgba(15, 15, 18, 0.95)', backdropFilter: 'blur(16px)' }}>
                    
                    <div className="p-5 border-b border-[var(--active-highlight)] flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5">
                                {unreadCount} Unread
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={() => markAllReadMutation.mutate()}
                                className="text-[10px] font-black tracking-widest text-[var(--primary-accent)] uppercase hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                             <div className="p-10 text-center text-xs font-bold text-[var(--text-muted)] animate-pulse">Loading notifications...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-10 text-center">
                                <Bell className="w-8 h-8 text-[var(--active-highlight)] mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-bold text-[var(--text-muted)]">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[rgba(255,255,255,0.03)]">
                                {notifications.filter(n => !n.read).map((n) => (
                                    <div key={n._id} className={`p-4 transition-colors hover:bg-[rgba(255,255,255,0.02)] group relative`}>
                                        <div className="flex gap-4">
                                            <div className="mt-1 flex-shrink-0">
                                                {TYPE_ICONS[n.type] || TYPE_ICONS.info}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <p className="text-[13px] font-bold text-white truncate leading-none">{n.title}</p>
                                                    <span className="text-[10px] font-medium text-[var(--text-muted)] flex-shrink-0">
                                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] font-medium text-[var(--text-muted)] leading-snug line-clamp-2">{n.message}</p>
                                                
                                                <div className="flex items-center gap-3 mt-3">
                                                    <button 
                                                        onClick={() => markReadMutation.mutate(n._id)}
                                                        className="text-[10px] font-black tracking-widest text-[var(--status-safe)] uppercase hover:opacity-80 transition-opacity"
                                                    >
                                                        Mark as read
                                                    </button>
                                                    {n.link && (
                                                        <Link 
                                                            to={n.link} 
                                                            className="flex items-center gap-1 text-[10px] font-black tracking-widest text-[var(--primary-accent)] uppercase hover:opacity-80"
                                                            onClick={() => { setIsOpen(false); markReadMutation.mutate(n._id); }}
                                                        >
                                                            View
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {notifications.filter(n => !n.read).length === 0 && notifications.length > 0 && (
                                      <div className="p-8 text-center bg-[rgba(255,255,255,0.01)]">
                                            <p className="text-xs font-bold text-[var(--text-muted)]">All caught up!</p>
                                            <p className="text-[10px] font-medium text-[var(--text-muted)] opacity-50 mt-1">Old notifications are in history.</p>
                                      </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Link 
                        to="/settings?tab=notifications" 
                        onClick={() => setIsOpen(false)}
                        className="block py-4 text-center text-[10px] font-black tracking-widest text-[var(--text-muted)] uppercase border-t border-[var(--active-highlight)] hover:bg-[var(--active-highlight)] hover:text-white transition-all"
                    >
                        View all history
                    </Link>
                </div>
            )}
        </div>
    );
}
