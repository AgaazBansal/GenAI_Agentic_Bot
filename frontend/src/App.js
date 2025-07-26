import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

let nextId = 1000; // Start manual IDs high to avoid collisions
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
console.log("Connecting to API at:", API_URL); // <-- ADD THIS LINE


function App() {
    // State for rich minutes
    const [discussionPoints, setDiscussionPoints] = useState([]);
    const [actionItems, setActionItems] = useState([]);
    const [overallSentiment, setOverallSentiment] = useState('');
    const [topics, setTopics] = useState([]);

    // General state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [notionStatus, setNotionStatus] = useState('');
    const fileInputRef = useRef(null);

    // RAG Chat state
    const [fullTranscript, setFullTranscript] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [userQuestion, setUserQuestion] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef(null);

    // State for manual entry
    const [showAddForm, setShowAddForm] = useState(null); // null, 'discussion', or 'action'
    const [newDiscussion, setNewDiscussion] = useState({ topic: '', summary: '' });
    const [newAction, setNewAction] = useState({ task: '', owner: '', deadline: '' });

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setDiscussionPoints([]); setActionItems([]); setOverallSentiment(''); setTopics([]);
        setChatHistory([]); setFullTranscript(''); setStatusMessage(''); setError(''); setNotionStatus('');
        setShowAddForm(null);
    };

    const handleProcessMeeting = async () => {
        if (!selectedFile) { setError('Please select a file first.'); return; }
        setIsLoading(true); setError(''); setStatusMessage('Processing meeting...');
        const formData = new FormData(); 
        formData.append('file', selectedFile);

        try {
            // THE FIX IS HERE: We must pass 'formData' as the second argument
            const response = await axios.post('${API_URL}/process-meeting', formData, { 
                headers: { 'Content-Type': 'multipart/form-data' } 
            });
            setDiscussionPoints(response.data.discussion_points); 
            setActionItems(response.data.action_items);
            setOverallSentiment(response.data.overall_sentiment); 
            setTopics(response.data.topics);
            setFullTranscript(response.data.transcript); 
            setStatusMessage('Meeting processed successfully!');
        } catch (err) { 
            setError('An error occurred. Check the backend console.'); 
            setStatusMessage(''); 
        }
        setIsLoading(false);
    };

    const handleDeleteItem = (id, type) => {
        if (type === 'discussion') { setDiscussionPoints(prev => prev.filter(item => item.id !== id)); } 
        else { setActionItems(prev => prev.filter(item => item.id !== id)); }
    };

    const handleNotionExport = async () => {
        setIsExporting(true); setNotionStatus('Exporting...');
        try {
            await axios.post('${API_URL}/export-to-notion', {
                overall_sentiment: overallSentiment, topics: topics,
                discussion_points: discussionPoints, action_items: actionItems
            });
            setNotionStatus('✅ Successfully exported!');
        } catch (err) { setNotionStatus('❌ Error exporting.'); }
        setIsExporting(false);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault(); if (!userQuestion.trim()) return;
        const question = userQuestion; const newHistory = [...chatHistory, { role: 'user', content: question }];
        setChatHistory(newHistory); setUserQuestion(''); setIsChatting(true);
        try {
            const response = await axios.post('${API_URL}/chat', { question: question, transcript: fullTranscript });
            setChatHistory([...newHistory, { role: 'bot', content: response.data.answer }]);
        } catch (err) { setChatHistory([...newHistory, { role: 'bot', content: 'Sorry, I encountered an error.' }]); }
        setIsChatting(false);
    };

    const handleAddDiscussionPoint = () => {
        if (!newDiscussion.topic || !newDiscussion.summary) return;
        setDiscussionPoints([...discussionPoints, { id: nextId++, ...newDiscussion }]);
        setNewDiscussion({ topic: '', summary: '' });
        setShowAddForm(null);
    };

    const handleAddActionItem = () => {
        if (!newAction.task || !newAction.owner) return;
        setActionItems([...actionItems, {
            id: nextId++,
            ...newAction,
            owner: newAction.owner.split(',').map(s => s.trim())
        }]);
        setNewAction({ task: '', owner: '', deadline: '' });
        setShowAddForm(null);
    };

    const hasResults = discussionPoints.length > 0 || actionItems.length > 0;

    return (
        <div className="app-container">
            <div className="App">
                <header className="hero-header">
                    <div className="hero-content">
                        <h1>Momentum AI</h1>
                        <p className="punchline">Turn meeting chaos into actionable clarity. Instantly.</p>
                    </div>
                </header>
                
                <main className="main-content">
                    {!hasResults ? (
                        <div className="uploader-view">
                            <h2>Process a New Meeting</h2>
                            <p className="subtitle">Upload your meeting audio file. Acceptable formats: MP3, MP4, WAV, M4A.</p>
                            <div className="input-container">
                                <input type="file" onChange={handleFileChange} ref={fileInputRef} accept="audio/*,video/*" style={{ display: 'none' }} />
                                <button className="upload-button" onClick={() => fileInputRef.current.click()}>Choose Audio/Video File</button>
                                {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}
                                <button className="process-button" onClick={handleProcessMeeting} disabled={isLoading || !selectedFile}>{isLoading ? 'Processing...' : 'Generate Minutes'}</button>
                            </div>
                            {statusMessage && <p className="status-message">{statusMessage}</p>}
                            {error && <p className="error">{error}</p>}
                        </div>
                    ) : (
                        <div className="results-view">
                            <div className="minutes-column">
                                <div className="output-container">
                                    <div className="export-header">
                                        <h2>Meeting Minutes Draft</h2>
                                        <button onClick={handleNotionExport} disabled={isExporting} className="export-button">{isExporting ? 'Exporting...' : 'Confirm & Export to Notion'}</button>
                                    </div>
                                    {notionStatus && <p className="notion-status">{notionStatus}</p>}

                                    <div className="metadata-container">
                                        <div className="sentiment-display"><strong>Overall Sentiment:</strong> {overallSentiment}</div>
                                        <div className="topics-display"><strong>Topics:</strong>{topics.map((topic, i) => <span key={i} className="topic-tag">{topic}</span>)}</div>
                                    </div>

                                    <div className="minutes-section">
                                        <h3>Discussion Points</h3>
                                        <ul>{discussionPoints.map((point) => (<li key={point.id}><button className="delete-btn" onClick={() => handleDeleteItem(point.id, 'discussion')} title="Delete Point">X</button><strong>{point.topic}</strong><p>{point.summary}</p></li>))}</ul>
                                        {showAddForm === 'discussion' ? (
                                            <div className="manual-add-form">
                                                <input type="text" placeholder="Topic" value={newDiscussion.topic} onChange={(e) => setNewDiscussion({ ...newDiscussion, topic: e.target.value })} />
                                                <textarea placeholder="Summary" value={newDiscussion.summary} onChange={(e) => setNewDiscussion({ ...newDiscussion, summary: e.target.value })} rows="3"></textarea>
                                                <div className="form-buttons"><button onClick={handleAddDiscussionPoint}>Add Point</button><button className="cancel-btn" onClick={() => setShowAddForm(null)}>Cancel</button></div>
                                            </div>
                                        ) : (
                                            <button className="add-item-btn" onClick={() => setShowAddForm('discussion')}>+ Add Discussion Point</button>
                                        )}
                                    </div>

                                    <div className="minutes-section">
                                        <h3>Action Items</h3>
                                        <ul>{actionItems.map((item) => (<li key={item.id}><button className="delete-btn" onClick={() => handleDeleteItem(item.id, 'action')} title="Delete Action Item">X</button><strong>Task:</strong> {item.task} <br /><strong>Owner:</strong> {item.owner.join(', ')} <br /><strong>Deadline:</strong> {item.deadline || 'N/A'}</li>))}</ul>
                                        {showAddForm === 'action' ? (
                                            <div className="manual-add-form">
                                                <input type="text" placeholder="Task description" value={newAction.task} onChange={(e) => setNewAction({ ...newAction, task: e.target.value })} />
                                                <input type="text" placeholder="Owner(s), comma separated" value={newAction.owner} onChange={(e) => setNewAction({ ...newAction, owner: e.target.value })} />
                                                <input type="date" value={newAction.deadline} onChange={(e) => setNewAction({ ...newAction, deadline: e.target.value })} />
                                                <div className="form-buttons"><button onClick={handleAddActionItem}>Add Task</button><button className="cancel-btn" onClick={() => setShowAddForm(null)}>Cancel</button></div>
                                            </div>
                                        ) : (
                                            <button className="add-item-btn" onClick={() => setShowAddForm('action')}>+ Add Action Item</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="chat-column">
                                <h2>Chat with Meeting History</h2>
                                 <p className="subtitle">Ask questions about this meeting.</p>
                                <div className="chat-container">
                                    <div className="chat-history">{chatHistory.map((msg, index) => (<div key={index} className={`chat-message ${msg.role}`}>{msg.content}</div>))}<div ref={chatEndRef} /></div>
                                    <form onSubmit={handleChatSubmit} className="chat-form">
                                        <input type="text" value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)} placeholder="e.g., What was the deadline for the pipeline fix?" disabled={isChatting || !fullTranscript} />
                                        <button type="submit" disabled={isChatting || !fullTranscript}>{isChatting ? 'Thinking...' : 'Send'}</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;