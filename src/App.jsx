import React, { useState, useRef, useEffect } from 'react';

export default function PixelBlockBuilder() {
  const [blocks, setBlocks] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [terminalLines, setTerminalLines] = useState([
    '> Welcome to Pixel Block Builder',
    '> Type "help" for commands'
  ]);
  const [input, setInput] = useState('');
  const terminalEndRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check if 'v' is pressed and not in the terminal input
      if (e.key === 'v' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        handlePaste();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [clipboard, blocks]);

  const menuItems = [
    { id: 'login', label: 'Login', color: '#ff6b6b' },
    { id: 'manager', label: 'Manager', color: '#4ecdc4' },
    { id: 'permission', label: 'Permission Manager', color: '#45b7d1' },
    { id: 'users', label: 'Users', color: '#f7b731' },
    { id: 'createfile', label: 'Create File', color: '#5f27cd' }
  ];

  // Connection rules: which blocks can connect to which
  const connectionRules = {
    login: ['manager', 'users'], // Login can connect to Manager and Users only
    manager: ['permission', 'users', 'createfile'], // Manager can connect to these
    permission: ['users', 'createfile'], // Permission Manager can connect to these
    users: ['createfile'], // Users can only connect to Create File
    createfile: [] // Create File cannot connect to anything (end node)
  };

  const handleMenuMouseDown = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newBlock = {
      id: Date.now(),
      label: item.label,
      color: item.color,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isBeingPlaced: true
    };
    
    setBlocks([...blocks, newBlock]);
    setDragging(newBlock.id);
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleBlockMouseDown = (e, id) => {
    if (e.button === 2) return; // Ignore right click for dragging
    
    // Don't start dragging if there's a context menu open for this block
    if (contextMenu && contextMenu.blockId === id) {
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(id);
    setContextMenu(null); // Close context menu when dragging
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleBlockClick = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If shift key is pressed, toggle selection
    if (e.shiftKey) {
      if (selectedBlocks.includes(id)) {
        setSelectedBlocks(selectedBlocks.filter(bid => bid !== id));
      } else {
        setSelectedBlocks([...selectedBlocks, id]);
      }
      setContextMenu(null);
      return;
    }
    
    // Toggle menu off if clicking the same block
    if (contextMenu && contextMenu.blockId === id) {
      setContextMenu(null);
      return;
    }
    
    const block = blocks.find(b => b.id === id);
    if (!block || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const blockWidth = 120;
    const menuHeight = 176; // Approximate height of 4 buttons
    
    let menuX, menuY;
    
    // Check if there's enough space on the right
    const spaceOnRight = canvasRect.width - (block.x + blockWidth);
    
    if (spaceOnRight >= menuWidth + 10) {
      // Place on right side of block
      menuX = block.x + blockWidth + 5;
      menuY = block.y;
    } else {
      // Place above the block, aligned with its left edge
      menuX = block.x;
      menuY = Math.max(0, block.y - menuHeight - 5);
    }
    
    setContextMenu({
      blockId: id,
      x: menuX,
      y: menuY
    });
  };

  const handleRemove = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    setContextMenu(null);
  };

  const handleCopy = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setClipboard({ ...block });
      addTerminalLine('> Block copied to clipboard');
    }
    setContextMenu(null);
  };

  const handleCut = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      setClipboard({ ...block });
      setBlocks(blocks.filter(b => b.id !== id));
      addTerminalLine('> Block cut to clipboard');
    }
    setContextMenu(null);
  };

  const handleDuplicate = (id) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      const newBlock = {
        ...block,
        id: Date.now(),
        x: block.x + 20,
        y: block.y + 20
      };
      setBlocks([...blocks, newBlock]);
      addTerminalLine('> Block duplicated');
    }
    setContextMenu(null);
  };

  const handlePaste = () => {
    if (clipboard) {
      const newBlock = {
        ...clipboard,
        id: Date.now(),
        x: clipboard.x + 30,
        y: clipboard.y + 30
      };
      setBlocks([...blocks, newBlock]);
      addTerminalLine('> Block pasted from clipboard');
    }
  };

  const handleConnectBlocks = () => {
    if (selectedBlocks.length === 2) {
      const firstBlock = blocks.find(b => b.id === selectedBlocks[0]);
      const secondBlock = blocks.find(b => b.id === selectedBlocks[1]);
      
      if (!firstBlock || !secondBlock) return;
      
      // Get the block types (labels converted to ids)
      const firstType = menuItems.find(item => item.label === firstBlock.label)?.id;
      const secondType = menuItems.find(item => item.label === secondBlock.label)?.id;
      
      // Check if connection is allowed
      const allowedConnections = connectionRules[firstType] || [];
      
      if (!allowedConnections.includes(secondType)) {
        addTerminalLine(`> ERROR: ${firstBlock.label} cannot connect to ${secondBlock.label}`);
        addTerminalLine(`> Allowed connections: ${allowedConnections.length > 0 ? allowedConnections.map(id => menuItems.find(m => m.id === id)?.label).join(', ') : 'None'}`);
        setSelectedBlocks([]);
        return;
      }
      
      const newConnection = {
        id: Date.now(),
        from: selectedBlocks[0],
        to: selectedBlocks[1],
        color: firstBlock ? firstBlock.color : '#22c55e'
      };
      setConnections([...connections, newConnection]);
      addTerminalLine(`> Connected ${firstBlock.label} to ${secondBlock.label}`);
      setSelectedBlocks([]);
    }
  };

  const handleDeleteSelectedBlocks = () => {
    if (selectedBlocks.length === 2) {
      setBlocks(blocks.filter(b => !selectedBlocks.includes(b.id)));
      setConnections(connections.filter(c => 
        !selectedBlocks.includes(c.from) && !selectedBlocks.includes(c.to)
      ));
      addTerminalLine(`> Deleted ${selectedBlocks.length} blocks`);
      setSelectedBlocks([]);
    }
  };


  const getBlockEdgePoints = (fromId, toId) => {
    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);
    
    if (!fromBlock || !toBlock) return { x1: 0, y1: 0, x2: 0, y2: 0, path: '', hide: true, arrowAngle: 0 };
    
    // If either block is being dragged, don't show connection
    if (dragging === fromId || dragging === toId) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, path: '', hide: true, arrowAngle: 0 };
    }
    
    // Start from right edge of first block
    const x1 = fromBlock.x + 120;
    const y1 = fromBlock.y + 25;
    
    // Calculate target block center
    const toCenter = {
      x: toBlock.x + 60,
      y: toBlock.y + 25
    };
    
    const blockWidth = 120;
    const blockHeight = 50;
    const offset = 20;
    const arrowOffset = 10; // Extra 10px for the perpendicular segment
    let x2, y2, arrowAngle, finalX, finalY;
    
    // Determine end point based on relative position
    // If second block is above first block (y is less), always point to bottom
    if (toBlock.y + blockHeight < fromBlock.y) {
      // Block is above - point to bottom edge
      finalX = toCenter.x;
      finalY = toBlock.y + blockHeight + offset;
      x2 = finalX;
      y2 = finalY + arrowOffset; // Stop 5px below final point
      arrowAngle = -90; // Point upward
    }
    // If second block is below first block, always point to top
    else if (toBlock.y > fromBlock.y + blockHeight + 100) {
      // Block is below - point to top edge
      finalX = toCenter.x;
      finalY = toBlock.y - offset;
      x2 = finalX;
      y2 = finalY - arrowOffset; // Stop 5px above final point
      arrowAngle = 90; // Point downward
    }
    // If second block is to the left
    else if (toBlock.x + blockWidth < fromBlock.x) {
      // Block is to the left - point to right edge
      finalX = toBlock.x + blockWidth + offset;
      finalY = toCenter.y;
      x2 = finalX + arrowOffset; // Stop 5px right of final point
      y2 = finalY;
      arrowAngle = 180; // Point left
    }
    // Otherwise point to left edge
    else {
      // Block is to the right - point to left edge
      finalX = toBlock.x - offset;
      finalY = toCenter.y;
      x2 = finalX - arrowOffset; // Stop 5px left of final point
      y2 = finalY;
      arrowAngle = 0; // Point right
    }
    
    // Create 90-degree path
    let path;
    const midX = x1 + (x2 - x1) / 2;
    
    // Choose path style based on relative positions
    if (Math.abs(y2 - y1) < 10) {
      // Horizontal line if nearly aligned, with final segment to arrow
      path = `M ${x1} ${y1} L ${x2} ${y2} L ${finalX} ${finalY}`;
    } else {
      // Two-segment 90-degree path, with final segment to arrow
      path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2} L ${finalX} ${finalY}`;
    }
    
    return {
      x1,
      y1,
      x2: finalX,
      y2: finalY,
      path,
      arrowAngle,
      hide: false
    };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const blockWidth = 120;
    const blockHeight = 50;
    
    let x = e.clientX - canvasRect.left - offset.x;
    let y = e.clientY - canvasRect.top - offset.y;
    
    // Constrain to canvas boundaries
    x = Math.max(0, Math.min(x, canvasRect.width - blockWidth));
    y = Math.max(0, Math.min(y, canvasRect.height - blockHeight));

    setBlocks(blocks.map(b => 
      b.id === dragging ? { ...b, x, y, isBeingPlaced: false } : b
    ));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleCanvasClick = () => {
    setContextMenu(null);
    setSelectedBlocks([]);
  };

  const addTerminalLine = (line) => {
    setTerminalLines(prev => [...prev, line]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!input.trim()) return;

      addTerminalLine(`> ${input}`);
      
      const cmd = input.toLowerCase().trim();
      const parts = cmd.split(' ');
      
      if (cmd === 'help') {
        addTerminalLine('Available commands:');
        addTerminalLine('  count - Count total blocks');
        addTerminalLine('  list - List all blocks');
        addTerminalLine('  paste - Paste copied/cut block');
        addTerminalLine('  rules - Show connection rules');
        addTerminalLine('  help - Show this message');
      } else if (cmd === 'count') {
        addTerminalLine(`> Total blocks: ${blocks.length}`);
      } else if (cmd === 'paste') {
        handlePaste();
      } else if (cmd === 'rules') {
        addTerminalLine('Connection Rules:');
        Object.entries(connectionRules).forEach(([from, toList]) => {
          const fromLabel = menuItems.find(m => m.id === from)?.label;
          const toLabels = toList.map(id => menuItems.find(m => m.id === id)?.label).join(', ');
          addTerminalLine(`  ${fromLabel} → ${toLabels || 'None'}`);
        });
      } else if (cmd === 'list') {
        if (blocks.length === 0) {
          addTerminalLine('> No blocks placed');
        } else {
          blocks.forEach(b => {
            addTerminalLine(`> ${b.label} at (${Math.round(b.x)}, ${Math.round(b.y)})`);
          });
        }
      } else {
        addTerminalLine(`> Unknown command: ${input}`);
      }
      
      setInput('');
    }
  };

  return (
    <div 
      className="flex h-screen bg-gray-900 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000000;
          border-left: 2px solid #22c55e;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #22c55e;
          border: 2px solid #000000;
          image-rendering: pixelated;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #16a34a;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:active {
          background: #15803d;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #22c55e #000000;
        }

        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes showArrow {
          0% {
            opacity: 0;
          }
          99% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>

      {/* Left Menu */}
      <div className="w-64 bg-gray-950 border-r-4 border-gray-700 p-4 flex flex-col gap-3">
        <div className="bg-green-900 px-4 py-2 border-2 border-green-500 mb-4">
          <span className="text-green-400 font-mono font-bold">COMPONENTS</span>
        </div>
        
        {menuItems.map(item => (
          <button
            key={item.id}
            onMouseDown={(e) => handleMenuMouseDown(e, item)}
            className="px-4 py-3 text-white border-4 border-black hover:opacity-80 font-mono text-sm font-bold cursor-grab active:cursor-grabbing text-left"
            style={{
              backgroundColor: item.color,
              imageRendering: 'pixelated'
            }}
          >
            {item.label}
          </button>
        ))}
        
        <div className="mt-auto pt-4 border-t-2 border-gray-700">
          <button
            onClick={() => {
              setBlocks([]);
              addTerminalLine('> All blocks cleared');
            }}
            className="w-full px-4 py-2 bg-red-600 text-white border-4 border-red-800 hover:bg-red-500 font-mono text-sm font-bold mb-2"
            style={{ imageRendering: 'pixelated' }}
          >
            CLEAR ALL
          </button>
          <p className="text-green-400 font-mono text-xs">
            Drag components to canvas →
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="flex-1 relative bg-gray-800 border-4 border-gray-700 overflow-hidden"
          style={{ 
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            imageRendering: 'pixelated'
          }}
        >
          {/* Draw connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <defs>
              {connections.map(conn => {
                const points = getBlockEdgePoints(conn.from, conn.to);
                
                return (
                  <marker
                    key={`marker-${conn.id}`}
                    id={`arrowhead-${conn.id}`}
                    markerWidth="6"
                    markerHeight="6"
                    refX="0"
                    refY="3"
                    orient={points.arrowAngle}
                  >
                    <polygon points="0 0, 6 3, 0 6" fill={conn.color} />
                  </marker>
                );
              })}
            </defs>
            {connections.map(conn => {
              const points = getBlockEdgePoints(conn.from, conn.to);
              
              // Don't render if blocks are being dragged
              if (points.hide) return null;
              
              // Calculate path length for animation
              const dx = points.x2 - points.x1;
              const dy = points.y2 - points.y1;
              const pathLength = Math.abs(dx) + Math.abs(dy) + 10;
              
              return (
                <g key={conn.id}>
                  <path
                    d={points.path}
                    stroke={conn.color}
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength}
                    style={{
                      animation: 'drawLine 0.6s ease-out forwards'
                    }}
                  />
                  <path
                    d={points.path}
                    stroke="transparent"
                    strokeWidth="3"
                    fill="none"
                    markerEnd={`url(#arrowhead-${conn.id})`}
                    style={{
                      animation: 'showArrow 0.6s ease-out forwards',
                      opacity: 0
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {blocks.map(block => (
            <div
              key={block.id}
              onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
              onClick={(e) => handleBlockClick(e, block.id)}
              className="absolute px-4 py-3 cursor-move font-mono text-sm font-bold text-white"
              style={{
                left: block.x,
                top: block.y,
                backgroundColor: block.color,
                imageRendering: 'pixelated',
                boxShadow: dragging === block.id 
                  ? '4px 4px 0px rgba(0,0,0,0.8), 2px 2px 0px rgba(0,0,0,0.4)'
                  : '6px 6px 0px rgba(0,0,0,0.5), 3px 3px 0px rgba(0,0,0,0.3)',
                minWidth: '120px',
                transition: 'box-shadow 0.1s',
                border: selectedBlocks.includes(block.id) ? '3px solid #22c55e' : 'none',
                zIndex: 10
              }}
            >
              {block.label}
            </div>
          ))}

          {/* Selection Actions Panel */}
          {selectedBlocks.length === 2 && (
            <div
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border-4 border-green-500 p-3 font-mono text-sm z-50 flex gap-2"
              style={{
                boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
                imageRendering: 'pixelated'
              }}
            >
              <button
                onClick={handleConnectBlocks}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-500 font-bold"
                style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}
              >
                ⚡ CONNECT
              </button>
              <button
                onClick={handleDeleteSelectedBlocks}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 font-bold"
                style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}
              >
                🗑️ DELETE BOTH
              </button>
            </div>
          )}

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="absolute bg-gray-900 border-4 border-gray-700 font-mono text-sm z-50"
              style={{
                left: `${contextMenu.x}px`,
                top: `${contextMenu.y}px`,
                boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
                imageRendering: 'pixelated',
                width: '180px'
              }}
            >
              <button
                onClick={() => handleDuplicate(contextMenu.blockId)}
                className="w-full px-4 py-2 text-left text-white hover:bg-blue-600 border-b-2 border-gray-700"
              >
                📋 Duplicate
              </button>
              <button
                onClick={() => handleCopy(contextMenu.blockId)}
                className="w-full px-4 py-2 text-left text-white hover:bg-green-600 border-b-2 border-gray-700"
              >
                📄 Copy
              </button>
              <button
                onClick={() => handleCut(contextMenu.blockId)}
                className="w-full px-4 py-2 text-left text-white hover:bg-yellow-600 border-b-2 border-gray-700"
              >
                ✂️ Cut
              </button>
              <button
                onClick={() => handleRemove(contextMenu.blockId)}
                className="w-full px-4 py-2 text-left text-white hover:bg-red-600"
              >
                🗑️ Remove
              </button>
            </div>
          )}
        </div>

        {/* Terminal Area */}
        <div className="h-48 bg-black border-t-4 border-green-500 flex flex-col font-mono text-sm">
          <div className="bg-green-900 px-4 py-2 border-b-2 border-green-500">
            <span className="text-green-400 font-bold">TERMINAL</span>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-2 text-green-400 custom-scrollbar">
            {terminalLines.map((line, i) => (
              <div key={i} className="mb-1">{line}</div>
            ))}
            <div ref={terminalEndRef} />
          </div>
          
          <div className="px-4 py-2 border-t-2 border-green-500">
            <div className="flex items-center">
              <span className="text-green-400 mr-2">&gt;</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-green-400 outline-none"
                placeholder="Type a command..."
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}