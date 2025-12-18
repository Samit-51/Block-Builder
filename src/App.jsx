import React, { useState, useRef, useEffect } from 'react';

export default function PixelBlockBuilderV2() {
  const [blocks, setBlocks] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [disconnectingConnections, setDisconnectingConnections] = useState([]);
  const [ifConnectionMode, setIfConnectionMode] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentSimulationBlock, setCurrentSimulationBlock] = useState(null);
  const [simulationPath, setSimulationPath] = useState([]);
  const [terminalLines, setTerminalLines] = useState([
    '> Welcome to Pixel Block Builder v2',
    '> Type "help" for commands',
  ]);
  const [input, setInput] = useState('');
  const [simulationPaused, setSimulationPaused] = useState(false);
  const [awaitingInput, setAwaitingInput] = useState(null);
  
  // System state
  const [systemState, setSystemState] = useState({
    currentUser: null,
    isLoggedIn: false,
    users: {
      'admin': { password: 'admin123', permissions: ['read', 'write', 'delete', 'create'] },
      'user': { password: 'user123', permissions: ['read', 'write'] },
      'guest': { password: 'guest123', permissions: ['read'] }
    },
    files: {},
    currentBlock: null
  });

  const terminalEndRef = useRef(null);
  const canvasRef = useRef(null);
  const simulationResolveRef = useRef(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'v' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        handlePaste();
      }
      if (e.key === 'Escape') {
        setIfConnectionMode(null);
        setSelectedBlocks([]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [clipboard, blocks]);

  const menuItems = [
    { id: 'login', label: 'Login', color: '#ff6b6b' },
    { id: 'register', label: 'Register', color: '#ff8787' },
    { id: 'dashboard', label: 'Dashboard', color: '#4ecdc4' },
    { id: 'permission', label: 'Permissions', color: '#45b7d1' },
    { id: 'users', label: 'User List', color: '#f7b731' },
    { id: 'createfile', label: 'Create File', color: '#5f27cd' },
    { id: 'editfile', label: 'Edit File', color: '#341f97' },
    { id: 'deletefile', label: 'Delete File', color: '#ee5a6f' },
    { id: 'if', label: 'IF/THEN', color: '#f368e0', special: 'conditional' },
    { id: 'database', label: 'Database', color: '#f8b500' },
    { id: 'notification', label: 'Notify', color: '#ff9ff3' }
  ];

  const connectionRules = {
    login: ['dashboard', 'users', 'register', 'if'],
    register: ['login', 'notification'],
    dashboard: ['users', 'permission', 'createfile', 'database', 'if'],
    permission: ['createfile', 'editfile', 'deletefile'],
    users: ['permission', 'editfile', 'notification', 'if'],
    createfile: ['database', 'notification', 'if'],
    editfile: ['database', 'notification', 'if'],
    deletefile: ['database', 'notification'],
    if: ['*'],
    database: ['notification'],
    notification: []
  };

  const addTerminalLine = (line) => {
    setTerminalLines(prev => [...prev, line]);
  };

  const executeBlockAction = async (block) => {
    setSystemState(prev => ({ ...prev, currentBlock: block.type }));
    
    switch (block.type) {
      case 'login':
        addTerminalLine(`> LOGIN: Enter credentials`);
        addTerminalLine(`> Format: login <username> <password>`);
        addTerminalLine(`> Available users: admin, user, guest`);
        setAwaitingInput('login');
        setSimulationPaused(true);
        
        return new Promise((resolve) => {
          simulationResolveRef.current = resolve;
        });

      case 'register':
        addTerminalLine(`> REGISTER: Create new account`);
        addTerminalLine(`> Format: register <username> <password>`);
        setAwaitingInput('register');
        setSimulationPaused(true);
        
        return new Promise((resolve) => {
          simulationResolveRef.current = resolve;
        });

      case 'dashboard':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in. Access denied.`);
          return 'error';
        }
        addTerminalLine(`> DASHBOARD: Welcome ${systemState.currentUser}!`);
        addTerminalLine(`> Your permissions: ${systemState.users[systemState.currentUser]?.permissions.join(', ')}`);
        addTerminalLine(`> Type "files" to see your files`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'success';

      case 'permission':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in`);
          return 'error';
        }
        const perms = systemState.users[systemState.currentUser]?.permissions || [];
        addTerminalLine(`> PERMISSION CHECK: ${perms.join(', ')}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'success';

      case 'users':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in`);
          return 'error';
        }
        addTerminalLine(`> USER LIST:`);
        Object.keys(systemState.users).forEach(user => {
          addTerminalLine(`>   - ${user} (${systemState.users[user].permissions.length} permissions)`);
        });
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'success';

      case 'createfile':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in`);
          return 'error';
        }
        const canCreate = systemState.users[systemState.currentUser]?.permissions.includes('create');
        if (!canCreate) {
          addTerminalLine(`> ERROR: No 'create' permission`);
          return 'error';
        }
        addTerminalLine(`> CREATE FILE: Format: create <filename>`);
        setAwaitingInput('createfile');
        setSimulationPaused(true);
        
        return new Promise((resolve) => {
          simulationResolveRef.current = resolve;
        });

      case 'editfile':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in`);
          return 'error';
        }
        const canEdit = systemState.users[systemState.currentUser]?.permissions.includes('write');
        if (!canEdit) {
          addTerminalLine(`> ERROR: No 'write' permission`);
          return 'error';
        }
        addTerminalLine(`> EDIT FILE: Format: edit <filename> <content>`);
        setAwaitingInput('editfile');
        setSimulationPaused(true);
        
        return new Promise((resolve) => {
          simulationResolveRef.current = resolve;
        });

      case 'deletefile':
        if (!systemState.isLoggedIn) {
          addTerminalLine(`> ERROR: Not logged in`);
          return 'error';
        }
        const canDelete = systemState.users[systemState.currentUser]?.permissions.includes('delete');
        if (!canDelete) {
          addTerminalLine(`> ERROR: No 'delete' permission`);
          return 'error';
        }
        addTerminalLine(`> DELETE FILE: Format: delete <filename>`);
        setAwaitingInput('deletefile');
        setSimulationPaused(true);
        
        return new Promise((resolve) => {
          simulationResolveRef.current = resolve;
        });

      case 'database':
        addTerminalLine(`> DATABASE: Saving to database...`);
        addTerminalLine(`> Files stored: ${Object.keys(systemState.files).length}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'success';

      case 'notification':
        addTerminalLine(`> NOTIFICATION: Action completed successfully ✓`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return 'success';

      case 'if':
        addTerminalLine(`> CONDITIONAL: Evaluating condition...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return Math.random() > 0.5 ? 'true' : 'false';

      default:
        return 'success';
    }
  };

  const processCommand = async (cmd, args) => {
    const command = cmd.toLowerCase();

    if (awaitingInput === 'login') {
      if (command === 'login' && args.length >= 2) {
        const [username, password] = args;
        const user = systemState.users[username];
        
        if (user && user.password === password) {
          setSystemState(prev => ({
            ...prev,
            currentUser: username,
            isLoggedIn: true
          }));
          addTerminalLine(`> ✓ Login successful! Welcome ${username}`);
          setAwaitingInput(null);
          setSimulationPaused(false);
          if (simulationResolveRef.current) {
            simulationResolveRef.current('success');
            simulationResolveRef.current = null;
          }
        } else {
          addTerminalLine(`> ✗ Login failed: Invalid credentials`);
          addTerminalLine(`> Try again: login <username> <password>`);
        }
      } else {
        addTerminalLine(`> Invalid format. Use: login <username> <password>`);
      }
      return;
    }

    if (awaitingInput === 'register') {
      if (command === 'register' && args.length >= 2) {
        const [username, password] = args;
        
        if (systemState.users[username]) {
          addTerminalLine(`> ✗ Registration failed: Username already exists`);
          addTerminalLine(`> Try again with different username`);
        } else {
          setSystemState(prev => ({
            ...prev,
            users: {
              ...prev.users,
              [username]: { password, permissions: ['read'] }
            }
          }));
          addTerminalLine(`> ✓ Registration successful! User ${username} created`);
          addTerminalLine(`> Default permissions: read`);
          setAwaitingInput(null);
          setSimulationPaused(false);
          if (simulationResolveRef.current) {
            simulationResolveRef.current('success');
            simulationResolveRef.current = null;
          }
        }
      } else {
        addTerminalLine(`> Invalid format. Use: register <username> <password>`);
      }
      return;
    }

    if (awaitingInput === 'createfile') {
      if (command === 'create' && args.length >= 1) {
        const filename = args[0];
        setSystemState(prev => ({
          ...prev,
          files: {
            ...prev.files,
            [filename]: { content: '', owner: prev.currentUser, created: new Date().toISOString() }
          }
        }));
        addTerminalLine(`> ✓ File '${filename}' created successfully`);
        setAwaitingInput(null);
        setSimulationPaused(false);
        if (simulationResolveRef.current) {
          simulationResolveRef.current('success');
          simulationResolveRef.current = null;
        }
      } else {
        addTerminalLine(`> Invalid format. Use: create <filename>`);
      }
      return;
    }

    if (awaitingInput === 'editfile') {
      if (command === 'edit' && args.length >= 2) {
        const filename = args[0];
        const content = args.slice(1).join(' ');
        
        if (!systemState.files[filename]) {
          addTerminalLine(`> ✗ File '${filename}' not found`);
          addTerminalLine(`> Try again with existing filename`);
        } else {
          setSystemState(prev => ({
            ...prev,
            files: {
              ...prev.files,
              [filename]: { ...prev.files[filename], content }
            }
          }));
          addTerminalLine(`> ✓ File '${filename}' updated successfully`);
          setAwaitingInput(null);
          setSimulationPaused(false);
          if (simulationResolveRef.current) {
            simulationResolveRef.current('success');
            simulationResolveRef.current = null;
          }
        }
      } else {
        addTerminalLine(`> Invalid format. Use: edit <filename> <content>`);
      }
      return;
    }

    if (awaitingInput === 'deletefile') {
      if (command === 'delete' && args.length >= 1) {
        const filename = args[0];
        
        if (!systemState.files[filename]) {
          addTerminalLine(`> ✗ File '${filename}' not found`);
          addTerminalLine(`> Try again with existing filename`);
        } else {
          setSystemState(prev => {
            const newFiles = { ...prev.files };
            delete newFiles[filename];
            return { ...prev, files: newFiles };
          });
          addTerminalLine(`> ✓ File '${filename}' deleted successfully`);
          setAwaitingInput(null);
          setSimulationPaused(false);
          if (simulationResolveRef.current) {
            simulationResolveRef.current('success');
            simulationResolveRef.current = null;
          }
        }
      } else {
        addTerminalLine(`> Invalid format. Use: delete <filename>`);
      }
      return;
    }

    // Regular commands when not awaiting input
    if (command === 'files') {
      if (Object.keys(systemState.files).length === 0) {
        addTerminalLine('> No files created yet');
      } else {
        addTerminalLine('> Your files:');
        Object.entries(systemState.files).forEach(([name, file]) => {
          addTerminalLine(`>   - ${name} (owner: ${file.owner})`);
        });
      }
    } else if (command === 'status') {
      addTerminalLine(`> Logged in: ${systemState.isLoggedIn ? 'Yes' : 'No'}`);
      if (systemState.isLoggedIn) {
        addTerminalLine(`> User: ${systemState.currentUser}`);
        addTerminalLine(`> Permissions: ${systemState.users[systemState.currentUser]?.permissions.join(', ')}`);
      }
    } else if (command === 'help') {
      addTerminalLine('Available commands:');
      addTerminalLine('  status - Show login status');
      addTerminalLine('  files - List all files');
      addTerminalLine('  count - Count total blocks');
      addTerminalLine('  list - List all blocks');
      addTerminalLine('  connections - List connections');
      addTerminalLine('  simulate - Run flow simulation');
      addTerminalLine('  stop - Stop simulation');
      addTerminalLine('  help - Show this message');
    } else if (command === 'count') {
      addTerminalLine(`> Total blocks: ${blocks.length}`);
    } else if (command === 'list') {
      if (blocks.length === 0) {
        addTerminalLine('> No blocks placed');
      } else {
        blocks.forEach(b => {
          addTerminalLine(`> ${b.label} at (${Math.round(b.x)}, ${Math.round(b.y)})`);
        });
      }
    } else if (command === 'connections') {
      if (connections.length === 0) {
        addTerminalLine('> No connections');
      } else {
        connections.forEach(c => {
          const from = blocks.find(b => b.id === c.from)?.label;
          const to = blocks.find(b => b.id === c.to)?.label;
          const path = c.pathType === 'normal' ? '' : ` [${c.label}]`;
          addTerminalLine(`> ${from} → ${to}${path}`);
        });
      }
    } else if (command === 'simulate') {
      if (isSimulating) {
        addTerminalLine('> Simulation already running');
      } else {
        handleSimulation(blocks, connections);
      }
    } else if (command === 'stop') {
      if (isSimulating) {
        setIsSimulating(false);
        setCurrentSimulationBlock(null);
        setSimulationPath([]);
        setSimulationPaused(false);
        setAwaitingInput(null);
        addTerminalLine('> Simulation stopped');
      } else {
        addTerminalLine('> No simulation running');
      }
    } else {
      addTerminalLine(`> Unknown command: ${command}`);
    }
  };

  const handleSimulation = async () => {
    // Find starting block: login > register > dashboard
    const loginBlock = blocks.find(b => b.type === 'login');
    const registerBlock = blocks.find(b => b.type === 'register');
    const dashboardBlock = blocks.find(b => b.type === 'dashboard');

    const startBlock = loginBlock || registerBlock || dashboardBlock;

    if (!startBlock) {
      addTerminalLine('> ERROR: No starting block found (need Login, Register, or Dashboard)');
      return;
    }

    // Reset system state
    setSystemState(prev => ({
      ...prev,
      currentUser: null,
      isLoggedIn: false,
      files: {},
      currentBlock: null
    }));

    setIsSimulating(true);
    addTerminalLine('> ═══════════════════════════════════');
    addTerminalLine(`> Simulation started from: ${startBlock.label}`);
    addTerminalLine('> ═══════════════════════════════════');

    await simulateFlow(startBlock.id, []);
  };

  const simulateFlow = async (blockId, visited) => {
    if (!isSimulating) return;

    if (visited.includes(blockId)) {
      addTerminalLine('> Loop detected - ending simulation');
      setIsSimulating(false);
      setCurrentSimulationBlock(null);
      setSimulationPath([]);
      return;
    }

    const block = blocks.find(b => b.id === blockId);
    if (!block) {
      setIsSimulating(false);
      setCurrentSimulationBlock(null);
      setSimulationPath([]);
      return;
    }

    setCurrentSimulationBlock(blockId);
    setSimulationPath([...visited, blockId]);
    addTerminalLine(`> ▶ Executing: ${block.label}`);

    const result = await executeBlockAction(block);

    if (result === 'error') {
      addTerminalLine(`> Simulation ended due to error`);
      setIsSimulating(false);
      setCurrentSimulationBlock(null);
      setSimulationPath([]);
      return;
    }

    const nextConnections = connections.filter(c => c.from === blockId);

    if (nextConnections.length === 0) {
      addTerminalLine(`> Simulation complete at: ${block.label}`);
      addTerminalLine('> ═══════════════════════════════════');
      setIsSimulating(false);
      setCurrentSimulationBlock(null);
      setSimulationPath([]);
      return;
    }

    if (block.special === 'conditional') {
      const trueConnection = nextConnections.find(c => c.pathType === 'true');
      const falseConnection = nextConnections.find(c => c.pathType === 'false');

      if (result === 'true' && trueConnection) {
        addTerminalLine(`> ✓ Condition: TRUE path taken`);
        await simulateFlow(trueConnection.to, [...visited, blockId]);
      } else if (result === 'false' && falseConnection) {
        addTerminalLine(`> ✗ Condition: FALSE path taken`);
        await simulateFlow(falseConnection.to, [...visited, blockId]);
      } else {
        addTerminalLine(`> Missing ${result.toUpperCase()} path - ending simulation`);
        setIsSimulating(false);
        setCurrentSimulationBlock(null);
        setSimulationPath([]);
      }
    } else {
      const nextConnection = nextConnections[0];
      await simulateFlow(nextConnection.to, [...visited, blockId]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!input.trim()) return;

      addTerminalLine(`> ${input}`);

      const parts = input.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);

      processCommand(cmd, args);
      setInput('');
    }
  };

  const handleMenuMouseDown = (e, item) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newBlock = {
      id: Date.now(),
      label: item.label,
      color: item.color,
      type: item.id,
      special: item.special,
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
    if (e.button === 2 || isSimulating) return;
    if (contextMenu && contextMenu.blockId === id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(id);
    setContextMenu(null);
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleBlockClick = (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSimulating) return;

    if (ifConnectionMode) {
      handleIfConnection(id);
      return;
    }

    if (e.shiftKey) {
      if (selectedBlocks.includes(id)) {
        setSelectedBlocks(selectedBlocks.filter(bid => bid !== id));
      } else {
        setSelectedBlocks([...selectedBlocks, id]);
      }
      setContextMenu(null);
      return;
    }

    if (contextMenu && contextMenu.blockId === id) {
      setContextMenu(null);
      return;
    }

    const block = blocks.find(b => b.id === id);
    if (!block || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const menuWidth = 180;
    const blockWidth = 120;
    const menuHeight = block.special === 'conditional' ? 220 : 176;

    let menuX, menuY;
    const spaceOnRight = canvasRect.width - (block.x + blockWidth);

    if (spaceOnRight >= menuWidth + 10) {
      menuX = block.x + blockWidth + 5;
      menuY = block.y;
    } else {
      menuX = block.x;
      menuY = Math.max(0, block.y - menuHeight - 5);
    }

    setContextMenu({
      blockId: id,
      x: menuX,
      y: menuY,
      isConditional: block.special === 'conditional'
    });
  };

  const handleIfConnection = (targetId) => {
    if (!ifConnectionMode) return;

    if (targetId === ifConnectionMode.blockId) {
      addTerminalLine('> ERROR: Cannot connect block to itself');
      setIfConnectionMode(null);
      return;
    }

    const sourceBlock = blocks.find(b => b.id === ifConnectionMode.blockId);
    const targetBlock = blocks.find(b => b.id === targetId);

    if (!sourceBlock || !targetBlock) {
      setIfConnectionMode(null);
      return;
    }

    const sourceType = sourceBlock.type;
    const targetType = targetBlock.type;
    const allowedConnections = connectionRules[sourceType] || [];

    if (!allowedConnections.includes(targetType) && !allowedConnections.includes('*')) {
      addTerminalLine(`> ERROR: ${sourceBlock.label} cannot connect to ${targetBlock.label}`);
      setIfConnectionMode(null);
      return;
    }

    const newConnection = {
      id: Date.now(),
      from: ifConnectionMode.blockId,
      to: targetId,
      pathType: ifConnectionMode.pathType,
      color: ifConnectionMode.pathType === 'true' ? '#22c55e' : '#ef4444',
      label: ifConnectionMode.pathType === 'true' ? 'TRUE' : 'FALSE'
    };

    setConnections([...connections, newConnection]);
    addTerminalLine(`> Connected IF ${ifConnectionMode.pathType.toUpperCase()} path to ${targetBlock.label}`);
    setIfConnectionMode(null);
    setContextMenu(null);
  };

  const handleConnectTrue = (id) => {
    setIfConnectionMode({ blockId: id, pathType: 'true' });
    addTerminalLine('> Click on a block to connect TRUE path (green)');
    setContextMenu(null);
  };

  const handleConnectFalse = (id) => {
    setIfConnectionMode({ blockId: id, pathType: 'false' });
    addTerminalLine('> Click on a block to connect FALSE path (red)');
    setContextMenu(null);
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

      const firstType = firstBlock.type;
      const secondType = secondBlock.type;
      const allowedConnections = connectionRules[firstType] || [];

      if (!allowedConnections.includes(secondType) && !allowedConnections.includes('*')) {
        addTerminalLine(`> ERROR: ${firstBlock.label} cannot connect to ${secondBlock.label}`);
        setSelectedBlocks([]);
        return;
      }

      const newConnection = {
        id: Date.now(),
        from: selectedBlocks[0],
        to: selectedBlocks[1],
        color: firstBlock.color,
        pathType: 'normal'
      };
      setConnections([...connections, newConnection]);
      addTerminalLine(`> Connected ${firstBlock.label} to ${secondBlock.label}`);
      setSelectedBlocks([]);
    }
  };

  const handleDisConnectBlocks = () => {
    if (selectedBlocks.length === 2) {
      const connectionToRemove = connections.find(c =>
        (c.from === selectedBlocks[0] && c.to === selectedBlocks[1]) ||
        (c.from === selectedBlocks[1] && c.to === selectedBlocks[0])
      );

      if (connectionToRemove) {
        setDisconnectingConnections([...disconnectingConnections, connectionToRemove.id]);
        setTimeout(() => {
          setConnections(connections.filter(c => c.id !== connectionToRemove.id));
          setDisconnectingConnections(prev => prev.filter(id => id !== connectionToRemove.id));
        }, 600);
        addTerminalLine(`> Disconnected selected blocks`);
      } else {
        addTerminalLine(`> No connection found between selected blocks`);
      }
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
    if (dragging === fromId || dragging === toId) {
      return { x1: 0, y1: 0, x2: 0, y2: 0, path: '', hide: true, arrowAngle: 0 };
    }

    const x1 = fromBlock.x + 120;
    const y1 = fromBlock.y + 25;
    const toCenter = { x: toBlock.x + 60, y: toBlock.y + 25 };
    const blockWidth = 120;
    const blockHeight = 50;
    const offset = 20;
    const arrowOffset = 10;
    let x2, y2, arrowAngle, finalX, finalY;

    if (toBlock.y + blockHeight < fromBlock.y) {
      finalX = toCenter.x;
      finalY = toBlock.y + blockHeight + offset;
      x2 = finalX;
      y2 = finalY + arrowOffset;
      arrowAngle = -90;
    } else if (toBlock.y > fromBlock.y + blockHeight + 100) {
      finalX = toCenter.x;
      finalY = toBlock.y - offset;
      x2 = finalX;
      y2 = finalY - arrowOffset;
      arrowAngle = 90;
    } else if (toBlock.x + blockWidth < fromBlock.x) {
      finalX = toBlock.x + blockWidth + offset;
      finalY = toCenter.y;
      x2 = finalX + arrowOffset;
      y2 = finalY;
      arrowAngle = 180;
    } else {
      finalX = toBlock.x - offset;
      finalY = toCenter.y;
      x2 = finalX - arrowOffset;
      y2 = finalY;
      arrowAngle = 0;
    }

    let path;
    const midX = x1 + (x2 - x1) / 2;

    if (Math.abs(y2 - y1) < 10) {
      path = `M ${x1} ${y1} L ${x2} ${y2} L ${finalX} ${finalY}`;
    } else {
      path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2} L ${finalX} ${finalY}`;
    }

    return { x1, y1, x2: finalX, y2: finalY, path, arrowAngle, hide: false };
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const blockWidth = 120;
    const blockHeight = 50;

    let x = e.clientX - canvasRect.left - offset.x;
    let y = e.clientY - canvasRect.top - offset.y;

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
    if (ifConnectionMode) return;
    setContextMenu(null);
    setSelectedBlocks([]);
  };

  return (
    <div
      className="flex h-screen bg-gray-900 select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000000; border-left: 2px solid #22c55e; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #22c55e; border: 2px solid #000000; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #16a34a; }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #22c55e #000000; }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes showArrow { 0%, 99% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes disconnectLine { 0% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: var(--path-length); opacity: 0; } }
        @keyframes hideArrow { 0% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } }
      `}</style>

      <div className="w-64 bg-gray-950 border-r-4 border-gray-700 p-4 flex flex-col gap-3">
        <div className="bg-green-900 px-4 py-2 border-2 border-green-500 mb-4">
          <span className="text-green-400 font-mono font-bold">COMPONENTS</span>
        </div>
        <div className="flex flex-col overflow-auto custom-scrollbar gap-3">
          {menuItems.map(item => (
            <button
              key={item.id}
              onMouseDown={(e) => handleMenuMouseDown(e, item)}
              className="px-4 py-3 text-white border-4 border-black hover:opacity-80 font-mono text-sm font-bold cursor-grab active:cursor-grabbing text-left"
              style={{ backgroundColor: item.color }}
            >
              {item.label}
              {item.special === 'conditional' && <span className="text-xs block mt-1 opacity-75">⚡ TRUE/FALSE</span>}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t-2 border-gray-700">
          <button
            onClick={() => {
              setBlocks([]);
              setConnections([]);
              addTerminalLine('> All blocks cleared');
            }}
            className="w-full px-4 py-2 bg-red-600 text-white border-4 border-red-800 hover:bg-red-500 font-mono text-sm font-bold mb-2"
          >
            CLEAR ALL
          </button>
          <p className="text-green-400 font-mono text-xs">Drag components to canvas →</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="flex-1 relative bg-gray-800 border-4 border-gray-700 overflow-hidden"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
            cursor: ifConnectionMode ? 'crosshair' : 'default'
          }}
        >
          {ifConnectionMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border-4 border-green-500 px-6 py-3 font-mono text-sm z-50"
              style={{ boxShadow: '6px 6px 0px rgba(0,0,0,0.5)', animation: 'pulse 2s infinite' }}>
              <span className={ifConnectionMode.pathType === 'true' ? 'text-green-400' : 'text-red-400'}>
                ⚡ Click a block to connect {ifConnectionMode.pathType.toUpperCase()} path
              </span>
              <span className="text-gray-400 ml-4">(ESC to cancel)</span>
            </div>
          )}

          {simulationPaused && awaitingInput && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-900 border-4 border-yellow-500 px-6 py-3 font-mono text-sm z-50"
              style={{ boxShadow: '6px 6px 0px rgba(0,0,0,0.5)', animation: 'pulse 2s infinite' }}>
              <span className="text-yellow-200">⏸️ Simulation paused - Enter command in terminal</span>
            </div>
          )}

          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            <defs>
              {connections.map(conn => {
                const points = getBlockEdgePoints(conn.from, conn.to);
                return (
                  <marker key={`marker-${conn.id}`} id={`arrowhead-${conn.id}`} markerWidth="6" markerHeight="6" refX="0" refY="3" orient={points.arrowAngle}>
                    <polygon points="0 0, 6 3, 0 6" fill={conn.color} />
                  </marker>
                );
              })}
            </defs>
            {connections.map(conn => {
              const points = getBlockEdgePoints(conn.from, conn.to);
              if (points.hide) return null;
              const dx = points.x2 - points.x1;
              const dy = points.y2 - points.y1;
              const pathLength = Math.abs(dx) + Math.abs(dy) + 10;
              const isDisconnecting = disconnectingConnections.includes(conn.id);

              return (
                <g key={conn.id}>
                  <path d={points.path} stroke={conn.color} strokeWidth="3" fill="none" strokeDasharray={pathLength}
                    strokeDashoffset={isDisconnecting ? 0 : pathLength}
                    style={isDisconnecting ? { '--path-length': pathLength, animation: 'disconnectLine 0.6s ease-in forwards' } : { animation: 'drawLine 0.6s ease-out forwards' }} />
                  <path d={points.path} stroke="transparent" strokeWidth="3" fill="none" markerEnd={`url(#arrowhead-${conn.id})`}
                    style={isDisconnecting ? { animation: 'hideArrow 0.6s ease-in forwards', opacity: 1 } : { animation: 'showArrow 0.6s ease-out forwards', opacity: 0 }} />
                  {conn.label && (
                    <text x={points.x1 + 30} y={points.y1 - 10} fill={conn.color} fontSize="12" fontWeight="bold" fontFamily="monospace">{conn.label}</text>
                  )}
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
                boxShadow: currentSimulationBlock === block.id
                  ? '0 0 20px rgba(34, 197, 94, 0.8), 6px 6px 0px rgba(0,0,0,0.5)'
                  : dragging === block.id
                  ? '4px 4px 0px rgba(0,0,0,0.8)'
                  : '6px 6px 0px rgba(0,0,0,0.5)',
                minWidth: '120px',
                border: selectedBlocks.includes(block.id) ? '3px solid #22c55e' :
                  (ifConnectionMode && ifConnectionMode.blockId === block.id) ? '3px solid #fbbf24' :
                  currentSimulationBlock === block.id ? '3px solid #22c55e' : 'none',
                zIndex: 10,
                animation: currentSimulationBlock === block.id ? 'pulse 2s infinite' : 'none'
              }}
            >
              {block.label}
            </div>
          ))}

          {selectedBlocks.length === 2 && !ifConnectionMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 border-4 border-green-500 p-3 font-mono text-sm z-50 flex gap-2"
              style={{ boxShadow: '6px 6px 0px rgba(0,0,0,0.5)' }}>
              <button onClick={handleConnectBlocks} className="px-4 py-2 bg-green-600 text-white hover:bg-green-500 font-bold" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}>⚡ CONNECT</button>
              <button onClick={handleDisConnectBlocks} className="px-4 py-2 bg-orange-600 text-white hover:bg-orange-500 font-bold" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}>⚡ DISCONNECT</button>
              <button onClick={handleDeleteSelectedBlocks} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 font-bold" style={{ boxShadow: '3px 3px 0px rgba(0,0,0,0.5)' }}>🗑️ DELETE BOTH</button>
            </div>
          )}

          {contextMenu && (
            <div className="absolute bg-gray-900 border-4 border-gray-700 font-mono text-sm z-50" style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, boxShadow: '4px 4px 0px rgba(0,0,0,0.5)', width: '180px' }}>
              {contextMenu.isConditional && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); handleConnectTrue(contextMenu.blockId); }} className="w-full px-4 py-2 text-left text-white hover:bg-green-600 border-b-2 border-gray-700">✓ Connect TRUE</button>
                  <button onClick={(e) => { e.stopPropagation(); handleConnectFalse(contextMenu.blockId); }} className="w-full px-4 py-2 text-left text-white hover:bg-red-600 border-b-2 border-gray-700">✗ Connect FALSE</button>
                </>
              )}
              <button onClick={() => handleDuplicate(contextMenu.blockId)} className="w-full px-4 py-2 text-left text-white hover:bg-blue-600 border-b-2 border-gray-700">📋 Duplicate</button>
              <button onClick={() => handleCopy(contextMenu.blockId)} className="w-full px-4 py-2 text-left text-white hover:bg-green-600 border-b-2 border-gray-700">📄 Copy</button>
              <button onClick={() => handleCut(contextMenu.blockId)} className="w-full px-4 py-2 text-left text-white hover:bg-yellow-600 border-b-2 border-gray-700">✂️ Cut</button>
              <button onClick={() => handleRemove(contextMenu.blockId)} className="w-full px-4 py-2 text-left text-white hover:bg-red-600">🗑️ Remove</button>
            </div>
          )}
        </div>

        <div className="h-48 bg-black border-t-4 border-green-500 flex flex-col font-mono text-sm">
          <div className="bg-green-900 px-4 py-2 border-b-2 border-green-500 flex justify-between items-center">
            <span className="text-green-400 font-bold">TERMINAL</span>
            {systemState.isLoggedIn && (
              <span className="text-green-300 text-xs">👤 {systemState.currentUser} | 📁 {Object.keys(systemState.files).length} files</span>
            )}
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
                placeholder={awaitingInput ? `Waiting for ${awaitingInput} command...` : "Type a command..."}
                autoFocus
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
