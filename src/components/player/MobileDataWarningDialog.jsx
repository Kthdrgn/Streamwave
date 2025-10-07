import React from 'react';
import { Button } from '@/components/ui/button';
import { WifiOff, TriangleAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileDataWarningDialog({ isOpen, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-slate-800/80 border border-white/20 rounded-2xl shadow-2xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <TriangleAlert className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Mobile Data Warning</h2>
            <p className="text-blue-200 mb-8">
              You are not connected to Wi-Fi. Streaming audio may use a significant amount of your mobile data.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-400"
              >
                Stream Anyway
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}