
import React, { useState, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext.tsx';
import { Task } from '../types.ts';
import { PlusIcon, TrashIcon, CheckCircleIcon, TagIcon, ClipboardDocumentListIcon, LinkIcon } from './icons.tsx';

interface TaskBoardProps {
    filterItemId?: string;
    title?: string;
    compact?: boolean;
}

const PriorityBadge: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const colors = {
        High: 'bg-rose-100 text-rose-700 border-rose-200',
        Medium: 'bg-amber-100 text-amber-700 border-amber-200',
        Low: 'bg-slate-100 text-slate-600 border-slate-200',
    };
    return (
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${colors[priority]}`}>
            {priority}
        </span>
    );
};

export const TaskBoard: React.FC<TaskBoardProps> = ({ filterItemId, title = "Task Management", compact = false }) => {
    const { tasks, inventory } = useAppState();
    const dispatch = useAppDispatch();
    
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [selectedLinkedItem, setSelectedLinkedItem] = useState<string>('');
    const [view, setView] = useState<'pending' | 'completed'>('pending');

    const filteredTasks = useMemo(() => {
        let t = tasks;
        if (filterItemId) {
            t = t.filter(task => task.linkedItemId === filterItemId);
        }
        return t.filter(task => view === 'pending' ? !task.isCompleted : task.isCompleted)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [tasks, filterItemId, view]);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskDesc.trim()) return;

        const newTask: Task = {
            id: `task-${Date.now()}`,
            description: newTaskDesc,
            priority: newTaskPriority,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            linkedItemId: filterItemId || (selectedLinkedItem || undefined) // Link to item if selected or filtered
        };

        dispatch({ type: 'ADD_TASK', payload: newTask });
        setNewTaskDesc('');
        setSelectedLinkedItem('');
    };

    const handleToggle = (id: string) => dispatch({ type: 'TOGGLE_TASK', payload: id });
    const handleDelete = (id: string) => dispatch({ type: 'DELETE_TASK', payload: id });

    return (
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${compact ? '' : 'h-full'}`}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className={`font-bold text-slate-800 font-heading flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'}`}>
                    <ClipboardDocumentListIcon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-primary`}/>
                    {title}
                </h3>
                <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                    <button 
                        onClick={() => setView('pending')} 
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'pending' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Pending
                    </button>
                    <button 
                        onClick={() => setView('completed')} 
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${view === 'completed' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Done
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-2 min-h-[150px]">
                {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                        <p className="text-xs font-medium">No {view} tasks.</p>
                    </div>
                ) : (
                    filteredTasks.map(task => {
                        // Find linked item name if showing global list
                        const linkedItemName = !filterItemId && task.linkedItemId 
                            ? inventory.find(i => i.id === task.linkedItemId)?.itemName 
                            : null;

                        return (
                            <div key={task.id} className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-slate-50/50 transition-all">
                                <button 
                                    onClick={() => handleToggle(task.id)}
                                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-primary'}`}
                                >
                                    {task.isCompleted && <CheckCircleIcon className="w-3.5 h-3.5" />}
                                </button>
                                <div className="flex-grow min-w-0">
                                    <p className={`text-sm ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                                        {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <PriorityBadge priority={task.priority} />
                                        {linkedItemName && (
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[150px]">
                                                <TagIcon className="h-3 w-3"/> {linkedItemName}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 ml-auto">
                                            {new Date(task.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        )
                    })
                )}
            </div>

            <form onSubmit={handleAddTask} className="p-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <div className="flex-grow relative">
                            <input 
                                type="text" 
                                value={newTaskDesc}
                                onChange={(e) => setNewTaskDesc(e.target.value)}
                                placeholder="Add a new task..." 
                                className="w-full pl-3 pr-20 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white shadow-sm"
                            />
                            <div className="absolute right-1 top-1">
                                <select 
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                    className="text-[10px] font-bold bg-slate-100 border-none rounded py-1 pl-2 pr-1 cursor-pointer focus:ring-0 text-slate-600 h-7"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={!newTaskDesc.trim()}
                            className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition disabled:opacity-50 shadow-sm flex-shrink-0"
                        >
                            <PlusIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    
                    {!filterItemId && (
                        <div className="flex items-center gap-2 px-1">
                            <LinkIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0"/>
                            <select
                                value={selectedLinkedItem}
                                onChange={(e) => setSelectedLinkedItem(e.target.value)}
                                className="text-xs bg-transparent border-none text-slate-500 hover:text-slate-700 focus:ring-0 cursor-pointer p-0 w-full truncate"
                            >
                                <option value="">Link to specific item (optional)...</option>
                                {inventory.map(item => (
                                    <option key={item.id} value={item.id}>{item.itemName}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};
