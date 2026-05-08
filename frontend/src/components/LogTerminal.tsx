import React, { useRef, useEffect } from 'react';

interface LogTerminalProps {
  logs: any[];
  isDone: boolean;
}

const LogTerminal: React.FC<LogTerminalProps> = ({ logs, isDone }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto" ref={terminalRef}>
      {logs.map((log, index) => (
        <div key={index} className="mb-1">
          <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
          <span className="text-blue-400">{log.state}:</span> {log.message}
        </div>
      ))}
      {isDone && <div className="text-white mt-4 border-t border-gray-700 pt-2">Job execution finished.</div>}
      {logs.length === 0 && <div className="text-gray-500 italic">Waiting for logs...</div>}
    </div>
  );
};

export default LogTerminal;
