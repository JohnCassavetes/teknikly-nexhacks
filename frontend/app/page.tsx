'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

export default function Home() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/hello/')
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => console.error(err));
  }, []);

  return (

    <div className="flex flex-col">
      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <Navbar/>

        <div className="min-h-screen w-full max-w-screen-xl mx-auto px-6 flex flex-col gap-10 justify-center items-center">

          <h1 className="text-6xl font-semibold bg-gradient-to-b from-white to-zinc-300 text-transparent bg-clip-text">
            Ace your technical interviews
          </h1>
          
          <button 
            className="rounded-lg py-2 px-4
              bg-gradient-to-b from-emerald-600 to-emerald-900 
              hover:bg-gradient-to-b hover:from-emerald-700 hover:to-emerald-900 
            "
          >
            <p className="text-lg">
              Try for free now
            </p>
          </button>
          
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-900">


        <div className="min-h-screen w-full max-w-screen-xl mx-auto px-6 flex flex-col justify-center items-center">

          <h1 className="text-4xl font-bold mb-4">Frontend + Backend</h1>
          <p className="text-xl">Message from API: {message || 'Loading...'}</p>

          
        </div>
      </div>
    </div>

    
  );
}
