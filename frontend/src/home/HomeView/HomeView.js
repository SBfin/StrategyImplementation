import { useState, useEffect } from 'react'
import { HomeCard } from '../HomeCard'
import s from './HomeView.module.css'

export default function HomeView(props) {

    useEffect(() => {
        
       });

       return (
        <div className={`${s.root}`}>
            <h1>Optimized liquidity Vaults for Uniswap V3</h1>
            <hr />
            <div className="row">
            <div className="col-4">
            <HomeCard />
            </div>
            <div className="col-4">
            <HomeCard />
            </div>
            <div className="col-4">
            <HomeCard />
            </div>
            </div>
        </div>
       )
    }