// src/App.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import UserInput from './components/UserInput';
import SuggestedQueries from './components/SuggestedQueries';
import styles from './styles/App.module.css';

// ALGORITHM & DATA
import buildingData from './assets/building.json'; 
import { buildGraph, aStar, splitPathByFloor } from './utils/pathfinder';
import MapCanvas from './utils/MapCanvas';

// IMAGES
import floor1Img from './assets/floor1.png';
import floor2Img from './assets/floor2.png';

const maps = {
  1: floor1Img,
  2: floor2Img
};

const API_BASE_URL = "https://hexahydrated-lorenzo-noncapitalistic.ngrok-free.dev"; 

const suggested = [
    "Where is room 114?", 
    "How do I get to room 213?", 
    "Where is the restroom?"
];

// --- КОМПОНЕНТ ПОВІДОМЛЕННЯ ---
const ChatMessage = ({ msg, onShowMap }) => {
    const hasMapData = msg.isMap && (msg.data?.nav_code || msg.data?.targetId);

    return (
        <div className={`${styles.message} ${msg.sender === 'user' ? styles.userMsg : styles.botMsg}`}>
            <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            
            {/* КНОПКА ВІДКРИТТЯ КАРТИ */}
            {hasMapData && (
                <button 
                    onClick={() => onShowMap(msg.data.nav_code || msg.data.targetId)}
                    style={{
                        marginTop: '12px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        backgroundColor: '#eff6ff', 
                        color: '#2563eb',           
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '600',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    <span>🗺️</span> Show Map
                </button>
            )}
        </div>
    );
};

const App = () => {
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isInputDisabled, setIsInputDisabled] = useState(false);
    
    // Стан для відображення карти
    const [pathSegments, setPathSegments] = useState(null); 
    const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

    // Стан для збереження цілі (поки користувач не скаже "Так" або натисне кнопку)
    const [pendingTarget, setPendingTarget] = useState(null);

    const chatEndRef = useRef(null);

    const graphData = useMemo(() => {
        try { return buildGraph(buildingData); } 
        catch (e) { console.error(e); return null; }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, pathSegments]);

    const handleClearChat = () => {
        setChatHistory([]);
        setPathSegments(null);
        setActiveSegmentIndex(0);
        setPendingTarget(null);
    };

    // --- ФУНКЦІЯ РОЗРАХУНКУ МАРШРУТУ ---
    const calculateAndShowRoute = (targetCode) => {
        if (!targetCode || !graphData) return;
        
        console.log(`App: Calculating route to ${targetCode}`);
        const startNode = "start"; 

        if (graphData.byId.has(startNode) && graphData.byId.has(String(targetCode))) {
            const pathIds = aStar(startNode, targetCode, graphData);

            if (pathIds && pathIds.length > 0) {
                const rawSegments = splitPathByFloor(pathIds, graphData.byId);
                const segmentsWithCoords = rawSegments.map(segment => ({
                    floor: segment.floor,
                    nodes: segment.path.map(id => graphData.byId.get(id)).filter(n => n)
                }));
                
                setPathSegments(segmentsWithCoords);
                setActiveSegmentIndex(0);
            } else {
                alert("Sorry, could not calculate route.");
            }
        } else {
            alert(`Target "${targetCode}" not found.`);
        }
    };

    const handleQuerySubmit = async (queryText) => {
        if (!queryText.trim()) return;

        const userMessage = { sender: 'user', text: queryText };
        setChatHistory((prev) => [...prev, userMessage]);

        setIsLoading(true);
        setIsInputDisabled(true);

        // Перевірка на "ТАК" / "YES"
        const lowerText = queryText.trim().toLowerCase();
        const isYes = ['yes', 'так', 'ok', 'sure', 'ага', 'давай'].some(word => lowerText.includes(word));

        if (isYes && pendingTarget) {
            setTimeout(() => {
                const mapMsg = { 
                    sender: 'bot', 
                    text: "Here is your route! 👇", 
                    data: { nav_code: pendingTarget }, // Додаємо дані, щоб з'явилася кнопка
                    isMap: true
                };
                setChatHistory(prev => [...prev, mapMsg]);
                
                // Автоматично відкриваємо карту
                calculateAndShowRoute(pendingTarget);
                
                setPendingTarget(null);
                setIsLoading(false);
                setIsInputDisabled(false);
            }, 600);
            return;
        }

        setPathSegments(null); 

        try {
            const response = await fetch(`${API_BASE_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: queryText }),
            });

            if (!response.ok) throw new Error('Server unavailable');
            const data = await response.json();
            
            const targetCode = data.data?.nav_code || data.data?.targetId;

            if (targetCode) {
                setPendingTarget(targetCode);
            } else {
                setPendingTarget(null);
            }

            // Це повідомлення БЕЗ кнопки (поки що)
            const botMessage = { 
                sender: 'bot', 
                text: data.response, 
                data: null, 
                isMap: false 
            };
            setChatHistory((prev) => [...prev, botMessage]);

        } catch (error) {
            console.error(error);
            setChatHistory((prev) => [...prev, { sender: 'bot', text: "⚠️ Error connecting to server." }]);
        } finally {
            setIsLoading(false);
            setIsInputDisabled(false);
        }
    };

    // --- НАВІГАЦІЯ ---
    const handleNextFloor = () => {
        if (pathSegments && activeSegmentIndex < pathSegments.length - 1) setActiveSegmentIndex(prev => prev + 1);
    };
    const handlePrevFloor = () => {
        if (pathSegments && activeSegmentIndex > 0) setActiveSegmentIndex(prev => prev - 1);
    };

    const renderScreen = () => {
        // КАРТА
        if (pathSegments && pathSegments.length > 0) {
            const currentSegment = pathSegments[activeSegmentIndex];
            const totalFloors = pathSegments.length;

            return (
                <div className={styles.mapContainer} style={{ paddingBottom: '20px', position: 'relative' }}>
                    <h3 style={{textAlign: 'center', color: '#333', marginBottom: '10px'}}>Route Calculated 🗺️</h3>
                    <div style={{ border: '1px solid #ddd', borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <div style={{ background: '#eff6ff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #dbeafe' }}>
                            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>Floor {currentSegment.floor}</span>
                            {totalFloors > 1 && <span style={{ fontSize: '12px', color: '#64748b' }}>Step {activeSegmentIndex + 1} of {totalFloors}</span>}
                        </div>
                        <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                            <MapCanvas key={activeSegmentIndex} floor={currentSegment.floor} mapImageSrc={maps[currentSegment.floor]} pathNodes={currentSegment.nodes} isActiveAnimation={true} />
                        </div>
                        {totalFloors > 1 && (
                            <>
                                {activeSegmentIndex < totalFloors - 1 && <button onClick={handleNextFloor} style={{ position: 'absolute', top: '60px', right: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', fontWeight: 'bold', fontSize: '14px', zIndex: 10 }}>Next Floor ➡</button>}
                                {activeSegmentIndex > 0 && <button onClick={handlePrevFloor} style={{ position: 'absolute', top: '60px', left: '10px', background: 'white', color: '#2563eb', border: '1px solid #2563eb', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '14px', zIndex: 10 }}>⬅ Back</button>}
                            </>
                        )}
                    </div>
                    <button onClick={() => setPathSegments(null)} style={{ display: 'block', margin: '20px auto', padding: '12px 24px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>Close Map</button>
                </div>
            );
        }

        // ЧАТ
        if (chatHistory.length > 0) {
            return (
                <div className={styles.chatList}>
                    {chatHistory.map((msg, index) => (
                        <ChatMessage key={index} msg={msg} onShowMap={calculateAndShowRoute} />
                    ))}
                    {isLoading && <div className={`${styles.message} ${styles.botMsg} ${styles.loadingMessage}`}><span style={{fontSize: '14px', color: '#666'}}>Poly is thinking...</span></div>}
                    <div ref={chatEndRef} />
                </div>
            );
        }

        // ПРИВІТАННЯ
        return (
            <div className={styles.welcomeScreen}>
                <div className={styles.heartIcon}>🤍</div> 
                <h2 className={styles.greeting}>How can I help you?</h2>
            </div>
        );
    };
    
    return (
        <div className={styles.appContainer}>
            <Header isQueryActive={chatHistory.length > 0} onClearChat={handleClearChat} />
            <main className={styles.mainContent}>
                {renderScreen()}
            </main>
            {chatHistory.length === 0 && (
                <div className={styles.suggestedQueriesWrapper}>
                    <SuggestedQueries queries={suggested} onSelect={handleQuerySubmit} />
                </div>
            )}
            <div className={styles.universalInputWrapper}>
                <UserInput 
                    onSubmit={handleQuerySubmit} 
                    // 👇 ВИПРАВЛЕНО ТУТ
                    placeholder={isLoading ? "Poly is thinking..." : "Ask about a room..."} 
                    isDisabled={isInputDisabled} 
                />
            </div>
        </div>
    );
};

export default App;