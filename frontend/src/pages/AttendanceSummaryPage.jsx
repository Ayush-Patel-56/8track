import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import api from '../lib/api';

const STATUS_STYLE = {
    safe: { label: 'SAFE', color: '#4CAF7D', bg: 'rgba(76, 175, 125, 0.1)', icon: CheckCircle2 },
    warning: { label: 'WARNING', color: '#E8A838', bg: 'rgba(232, 168, 56, 0.1)', icon: AlertCircle },
    danger: { label: 'DANGER', color: '#E85C5C', bg: 'rgba(232, 92, 92, 0.1)', icon: XCircle },
};

export default function AttendanceSummaryPage() {
    const { data: subjects = [], isLoading } = useQuery({
        queryKey: ['subjects'],
        queryFn: () => api.get('/subjects').then(r => r.data.subjects || r.data),
    });

    if (isLoading) return <div className="py-20 text-center text-muted-foreground animate-pulse">Loading attendance overview...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">Attendance Overview</h1>
                <p className="text-[15px] font-medium mt-2 text-[var(--text-muted)]">Track your progress across all subjects</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {subjects.map((sub, i) => {
                    const status = sub.status || 'danger';
                    const st = STATUS_STYLE[status];
                    const StatusIcon = st.icon;

                    return (
                        <Link key={sub._id} to={`/attendance/${sub._id}`} className="group relative bg-[var(--card-bg)] rounded-3xl p-6 border border-[rgba(255,255,255,0.05)] transition-all hover:bg-[var(--active-highlight)] hover:border-[var(--primary-accent)]">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.02)] flex items-center justify-center border border-[rgba(255,255,255,0.05)]">
                                        <Calendar className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--primary-accent)] transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-tight leading-none mb-2">{sub.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black tracking-widest text-[var(--text-muted)] uppercase">{sub.code || 'CODE'}</span>
                                            <div className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-20" />
                                            <span className="text-[12px] font-medium text-[var(--text-muted)]">{sub.attendedClasses} / {sub.totalClasses} classes attended</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-12">
                                    <div className="text-right">
                                        <div className="flex items-baseline gap-1 justify-end">
                                            <span className="text-2xl font-black text-white font-mono">{Math.round(sub.percentage ?? 0)}%</span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 mt-1" style={{ color: st.color }}>
                                            <StatusIcon className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black tracking-widest uppercase">{st.label}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.02)] flex items-center justify-center transition-all group-hover:bg-[rgba(232,168,56,0.1)] group-hover:text-[var(--primary-accent)]">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                             </div>
                             
                             {/* Mini progress bar on hover */}
                             <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[var(--primary-accent)] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full" />
                        </Link>
                    );
                })}
            </div>
            
            {subjects.length === 0 && (
                <div className="py-20 text-center bg-[rgba(255,255,255,0.01)] rounded-3xl border border-dashed border-[rgba(255,255,255,0.1)]">
                    <p className="text-lg font-bold text-white">No subjects yet</p>
                    <Link to="/subjects" className="text-sm font-bold text-[var(--primary-accent)] hover:underline mt-2 inline-block">Add subjects to track attendance</Link>
                </div>
            )}
        </div>
    );
}
