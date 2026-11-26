import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useNetwork } from '../context/NetworkStatusContext.jsx';
import { ErrorBox } from '../components/Feedback.jsx';
import AiNavigation from '../components/AiNavigation.jsx';
import BagImage from '../components/BagImage.jsx';
import Icon from '../components/Icon.jsx';
import { money } from '../utils/format.js';

const examples = [
  'Which bags fit a 16-inch laptop?',
  'Which bags can I personalize?',
  'How much is shipping?',
];

function RelatedBags({ products }) {
  if (!products.length) return null;
  return <ul className="chat-products" aria-label="Related catalog bags">
    {products.map((bag) => <li key={bag.id}>
      <Link to={'/products/' + bag.id}>
        <span className="chat-product-image" style={{ backgroundColor: bag.background }}><BagImage bag={bag} decorative /></span>
        <span><strong>{bag.name}</strong><small>{money(bag.price_cents)} · {bag.stock ? 'In stock' : 'Sold out'}</small>
          <small>{bag.laptop_inches ? 'Fits up to ' + bag.laptop_inches + '″' : 'No laptop compartment'}{bag.monogram_cents ? ' · Monogram ' + money(bag.monogram_cents) : ''}</small>
        </span>
      </Link>
    </li>)}
  </ul>;
}

export default function ShoppingAssistant() {
  const online = useNetwork();
  const [params] = useSearchParams();
  const [prompt, setPrompt] = useState(() => (params.get('question') || '').slice(0, 500));
  const [turns, setTurns] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const lastReply = useRef(null);

  useEffect(() => {
    if (turns.length) lastReply.current?.scrollIntoView({ block: 'nearest' });
  }, [turns]);

  async function submit(event) {
    event.preventDefault();
    const question = prompt.trim();
    if (busy || !online || question.length < 5) return;
    setBusy(true);
    setError(null);
    const history = turns.slice(-3).flatMap((turn) => [
      { role: 'user', text: turn.question }, { role: 'assistant', text: turn.answer },
    ]);
    try {
      const { data } = await api('/ai/assistant', { method: 'POST', body: { prompt: question, history } });
      setTurns((previous) => [...previous, { question, ...data }]);
      setPrompt('');
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  return <section className="content narrow assistant-page">
    <div className="page-heading">
      <p className="eyebrow"><Icon name="sparkle" size={17} /> AI-Assisted</p>
      <h1>Shopping Assistant</h1>
      <p>Ask about bag features, laptop fit, monograms, and our store.</p>
    </div>
    <AiNavigation />
    {!turns.length && <div className="summary-card assistant-examples">
      <h2>What can I help you find?</h2>
      <div className="example-questions">{examples.map((question) =>
        <button key={question} className="button subtle" type="button" disabled={busy || !online} onClick={() => { setPrompt(question); input.current?.focus(); }}>{question}</button>)}</div>
    </div>}
    <div className="chat-history" role="log" aria-label="Shopping conversation" aria-live="polite" aria-busy={busy}>
      {turns.map((turn, index) => <div key={index} className="chat-turn" ref={index === turns.length - 1 ? lastReply : null}>
        <p className="chat-question">{turn.question}</p>
        <article className="chat-answer">
          <p className="ai-reply-label"><Icon name="sparkle" size={17} />{turn.aiAssisted ? 'Shopping Assistant' : 'Catalog help'}</p>
          <p className="chat-text">{turn.answer}</p>
          <RelatedBags products={turn.products} />
          {!turn.aiAssisted && <Link className="text-link" to="/products">Browse the catalog</Link>}
        </article>
      </div>)}
      {busy && <p className="feedback" role="status">Checking available bag details…</p>}
    </div>
    <form className="summary-card form-stack assistant-form" onSubmit={submit}>
      <label htmlFor="assistant-question">Your question</label>
      <textarea id="assistant-question" ref={input} value={prompt} onChange={(event) => setPrompt(event.target.value)}
        minLength={5} maxLength={500} rows={3} required placeholder="Does the Desk to Dinner Tote fit my laptop?" disabled={busy || !online} />
      <ErrorBox error={error} />
      <div className="section-title">
        {turns.length ? <button className="text-link" type="button" disabled={busy} onClick={() => { setTurns([]); setPrompt(''); setError(null); }}>Clear chat</button> : <small>{prompt.length}/500</small>}
        <button className="button" disabled={busy || !online || prompt.trim().length < 5}>{!online ? 'Assistant is offline' : busy ? 'Thinking…' : 'Send question'}</button>
      </div>
    </form>
  </section>;
}
