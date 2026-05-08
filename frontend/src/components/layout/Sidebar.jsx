import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    LayoutDashboard, CalendarCheck, ClipboardList,
    GraduationCap, TrendingUp, Timer, BookOpen, Zap, LogOut, Settings,
    Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { useToast } from '../common/Toast';

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
    { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
    { to: '/exams', icon: GraduationCap, label: 'Exams' },
    { to: '/progress', icon: TrendingUp, label: 'My Progress' },
    { to: '/focus', icon: Timer, label: 'Focus Mode' },
    { to: '/subjects', icon: BookOpen, label: 'Subjects' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = import.meta.env.SSR ? [true, () => {}] : React.useState(navigator.onLine);

    React.useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    const queryClient = useQueryClient();
    const { showToast } = useToast();

    const logoutMutation = useMutation({
        mutationFn: () => api.post('/auth/logout'),
        onSettled: () => { logout(); navigate('/auth'); },
    });

    // ── Queries ──
    const { data: scheduleData } = useQuery({
        queryKey: ['schedule'],
        queryFn: () => api.get('/schedule').then(r => r.data.schedule),
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ['subjects'],
        queryFn: () => api.get('/subjects').then(r => r.data.subjects || r.data),
    });

    // ── Quick Mark Logic ──
    const currentClass = React.useMemo(() => {
        if (!scheduleData || !subjects.length) return null;
        
        const now = new Date();
        const currentDayName = format(now, 'EEEE');
        const nowHHMM = format(now, 'HH:mm');
        
        const todaysSchedule = scheduleData.find(d => d.day === currentDayName);
        if (!todaysSchedule || todaysSchedule.isHoliday || !todaysSchedule.slots?.length) return null;

        const slot = todaysSchedule.slots.find(s => nowHHMM >= s.startTime && nowHHMM <= s.endTime);
        if (!slot) return null;

        const subject = subjects.find(sub => 
            sub.name.toLowerCase().trim() === slot.subjectName.toLowerCase().trim()
        );

        return subject ? { ...slot, subjectId: subject._id } : null;
    }, [scheduleData, subjects]);

    const markMutation = useMutation({
        mutationFn: (data) => api.post('/attendance/mark', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            queryClient.invalidateQueries({ queryKey: ['global-attendance'] });
            showToast(`Marked ${currentClass?.subjectName} as Present!`, 'success');
        },
        onError: (err) => showToast(err.response?.data?.message || 'Failed to mark attendance', 'error'),
    });

    const handleQuickMark = () => {
        if (!currentClass) return;
        markMutation.mutate({
            subjectId: currentClass.subjectId,
            status: 'present',
            startTime: currentClass.startTime,
            date: new Date().toISOString()
        });
    };

    return (
        <aside className="flex flex-col justify-between w-[200px] min-h-screen py-6 px-4 flex-shrink-0 dot-matrix"
            style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--active-highlight)' }}>

            <div>
                {/* Logo */}
                <div className="flex items-center gap-3 px-2 mb-8">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl flex-shrink-0"
                        style={{ background: 'var(--primary-accent)', color: 'var(--sidebar-bg)' }}>
                        8
                    </div>
                    <span className="font-bold text-xl text-white tracking-tight">8Track</span>
                </div>

                {/* User profile */}
                <div className="flex items-center gap-3 px-2 mb-8">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-[var(--active-highlight)]">
                        <img 
                            src={`https://api.dicebear.com/7.x/${user?.avatarStyle || 'avataaars'}/svg?seed=${user?.avatarSeed || user?.name || 'User'}`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-[14px] font-bold text-[var(--text-warm)] truncate leading-tight">{user?.name || ''}</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                        <NavLink key={to} to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all group ${
                                    isActive 
                                    ? 'text-[var(--primary-accent)]' 
                                    : 'text-[var(--text-muted)] hover:text-white'
                                }`
                            }
                            style={({ isActive }) => isActive
                                ? { 
                                    background: 'var(--active-highlight)', 
                                    border: '1px solid var(--primary-accent)' 
                                }
                                : {}
                            }
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${label === 'Dashboard' ? 'text-inherit' : ''}`} />
                            {label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-4">
                <button
                    onClick={handleQuickMark}
                    disabled={!currentClass || markMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] border border-[var(--primary-accent)] disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group overflow-hidden relative"
                    style={{ color: 'var(--primary-accent)' }}
                    title={currentClass ? `Mark ${currentClass.subjectName} as Present` : 'No class currently in progress'}
                >
                    {markMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Zap className={`w-4 h-4 ${currentClass ? 'fill-[var(--primary-accent)] animate-pulse' : ''}`} />
                            Quick Mark
                        </>
                    )}
                    {currentClass && (
                        <div className="absolute inset-0 bg-[var(--primary-accent)] opacity-0 group-hover:opacity-5 transition-opacity" />
                    )}
                </button>

                <div className="flex items-center justify-between px-2">
                    <div 
                        className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                            isOnline ? 'text-[var(--status-safe)]' : 'text-[var(--status-danger)] animate-pulse'
                        }`}
                    >
                        <span 
                            className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
                                isOnline ? 'bg-[var(--status-safe)]' : 'bg-[var(--status-danger)]'
                            }`} 
                        />
                        {isOnline ? 'Synced' : 'Offline'}
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => logoutMutation.mutate()}
                            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}

