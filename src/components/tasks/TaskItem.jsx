import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Circle,
    ArrowUpCircle,
    Pencil,
    Play
} from "lucide-react";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TaskItem({ task, onStatusChange, onEdit }) {
    const priorityColors = {
        low: "bg-blue-100 text-blue-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-red-100 text-red-800"
    };

    const categoryColors = {
        work: "bg-indigo-100 text-indigo-800",
        personal: "bg-purple-100 text-purple-800",
        shopping: "bg-pink-100 text-pink-800",
        health: "bg-green-100 text-green-800",
        learning: "bg-amber-100 text-amber-800"
    };

    const statusIcons = {
        todo: <Circle className="w-5 h-5 text-gray-400" />,
        in_progress: <ArrowUpCircle className="w-5 h-5 text-blue-500" />,
        done: <CheckCircle2 className="w-5 h-5 text-green-500" />
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <Card className="bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div className="flex items-start gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="mt-1 hover:opacity-70 transition-opacity">
                                    {statusIcons[task.status]}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onStatusChange(task, "todo")}>
                                    <Circle className="w-4 h-4 mr-2 text-gray-400" />
                                    Mark as Todo
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange(task, "in_progress")}>
                                    <ArrowUpCircle className="w-4 h-4 mr-2 text-blue-500" />
                                    Mark as In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onStatusChange(task, "done")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                    Mark as Done
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div>
                            <CardTitle className={task.status === 'done' ? 'line-through text-gray-500' : ''}>
                                {task.title}
                            </CardTitle>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                <Badge className={priorityColors[task.priority]}>
                                    {task.priority} priority
                                </Badge>
                                {task.status === 'in_progress' && (
                                    <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                                )}
                                <Badge className={categoryColors[task.category]}>
                                    {task.category}
                                </Badge>
                                {task.due_date && (
                                    <Badge variant="outline" className="flex items-center gap-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(new Date(task.due_date), 'MMM d')}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(task)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                </CardHeader>
                {task.description && (
                    <CardContent>
                        <p className="text-gray-600">{task.description}</p>
                    </CardContent>
                )}
            </Card>
        </motion.div>
    );
}