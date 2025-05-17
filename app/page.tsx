import React from 'react';

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <section className="hero bg-gray-100 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to AI Training</h1>
        <p className="text-lg">Elevate your skills with our cutting-edge courses</p>
      </section>

      <section className="p-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Pain/Solution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded shadow">
            <h3 className="font-bold mb-2">Pain Point 1</h3>
            <p>Explanation of problem and how we solve it.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded shadow">
            <h3 className="font-bold mb-2">Pain Point 2</h3>
            <p>Explanation of problem and how we solve it.</p>
          </div>
          <div className="p-4 bg-gray-50 rounded shadow">
            <h3 className="font-bold mb-2">Pain Point 3</h3>
            <p>Explanation of problem and how we solve it.</p>
          </div>
        </div>
      </section>

      <section className="training-lineup bg-white py-12">
        <h2 className="text-2xl font-semibold mb-8 text-center">Training Lineup</h2>
        <ul className="max-w-2xl mx-auto space-y-4">
          <li className="p-4 bg-gray-50 rounded shadow">Course 1 Description</li>
          <li className="p-4 bg-gray-50 rounded shadow">Course 2 Description</li>
          <li className="p-4 bg-gray-50 rounded shadow">Course 3 Description</li>
        </ul>
      </section>

      <section className="cta-banner bg-blue-600 text-white py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Level Up?</h2>
        <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded">
          Join Now
        </button>
      </section>

      <footer className="bg-gray-800 text-white text-center py-8">
        &copy; {new Date().getFullYear()} AI Training. All rights reserved.
      </footer>
    </main>
  );
}
