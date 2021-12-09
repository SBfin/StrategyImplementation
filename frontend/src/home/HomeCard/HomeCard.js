import { useState, useEffect } from 'react'
import s from './HomeCard.module.css'

export default function HomeCard(props) {

    useEffect(() => {
        
       });

       return (
        <div className={`card ${s.root}`}>
            <div className={`card-body ${s.body}`}>
                <p>state: ACTIVE</p>
                <hr />
                <h5 className="card-title">WETH / DAI</h5>
                <hr />
                <h6 className="card-subtitle mb-2 text-muted">Card subtitle</h6>
                <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
                <a href="#" className="card-link">Card link</a>
                <a href="#" className="card-link">Another link</a>
            </div>
        </div>

      
       )
    }