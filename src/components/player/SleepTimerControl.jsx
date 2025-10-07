import React from 'react';
import { usePlayer } from './PlayerContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Moon } from 'lucide-react';

const formatTime = (seconds) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function SleepTimerControl() {
    const { 
        isSleepTimerActive, 
        sleepTimerRemaining, 
        setSleepTimer, 
        cancelSleepTimer 
    } = usePlayer();

    const timerOptions = [15, 30, 45, 60, 90];

    const handleSelect = (minutes) => {
        setSleepTimer(minutes);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="p-2 rounded-lg transition-colors relative"
                    style={{ 
                        backgroundColor: 'transparent', 
                        color: 'var(--text-primary)' 
                    }} 
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--button-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    title={isSleepTimerActive ? `Sleep timer: ${formatTime(sleepTimerRemaining)} remaining` : 'Set sleep timer'}
                >
                    {isSleepTimerActive ? (
                        <div className="flex flex-col items-center justify-center text-xs font-bold w-6 h-6">
                            <span>{formatTime(sleepTimerRemaining).split(':')[0]}</span>
                            <span className="text-[8px] -mt-1">{formatTime(sleepTimerRemaining).split(':')[1]}</span>
                        </div>
                    ) : (
                        <Clock className="w-6 h-6" />
                    )}
                    {isSleepTimerActive && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400"></div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-48"
                style={{ 
                    backgroundColor: 'var(--bg-from-color)', 
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                }}
            >
                <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-2">
                    <Moon className="w-4 h-4" /> Sleep Timer
                </div>
                <DropdownMenuSeparator style={{backgroundColor: 'var(--border-color)'}}/>
                {timerOptions.map(minutes => (
                    <DropdownMenuItem 
                        key={minutes} 
                        onClick={() => handleSelect(minutes)}
                        className="focus:bg-[var(--button-bg)] focus:text-[var(--text-primary)]"
                    >
                        {minutes} minutes
                    </DropdownMenuItem>
                ))}
                {isSleepTimerActive && (
                    <>
                        <DropdownMenuSeparator style={{backgroundColor: 'var(--border-color)'}}/>
                        <DropdownMenuItem 
                            onClick={cancelSleepTimer} 
                            className="text-red-400 focus:bg-red-500/20 focus:text-red-300"
                        >
                            Cancel Timer
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}