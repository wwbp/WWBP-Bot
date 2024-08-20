import React, { useState } from "react";
import { useEffect } from "react";
import {  fetchData } from "../utils/api";

function InteractionMode({ selectedMode, handleModeChange }) {
    const onModeChange = (e) => {
        handleModeChange(e.target.value);
      };
    return (
        <div>
        <h2 style={{ fontSize: '1.25rem' }}>Interaction Mode</h2>
        <div>
        <label>
            <input type="radio" value="text" checked={selectedMode === "text"} onChange={onModeChange}/>
            Text
        </label>
        </div>
        <div>
        <label>
            <input type="radio" value="audio" checked={selectedMode === "audio"} onChange={onModeChange}/>
            Audio
        </label>
        </div>
        <div>
        <label>
            <input type="radio" value="text-then-audio" checked={selectedMode === "text-then-audio"} onChange={onModeChange}/>
            Text then Audio
        </label>
        </div> 
        <div>
        <label>
            <input type="radio" value="audio-then-text" checked={selectedMode === "audio-then-text"} onChange={onModeChange}/>
            Audio then Text
        </label>
        </div>
        <div>
        <label>
            <input type="radio" value="audio-only" checked={selectedMode === "audio-only"} onChange={onModeChange}/>
            Audio Only
        </label>
        </div>                                 
        </div>
    );
    }

export default InteractionMode;    