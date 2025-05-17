import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: handle submission
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="company" value={form.company} onChange={handleChange} placeholder="Company" />
      <input name="name" value={form.name} onChange={handleChange} placeholder="Name" />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
      <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
      <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" />
      <button type="submit">Submit</button>
    </form>
  );
}
