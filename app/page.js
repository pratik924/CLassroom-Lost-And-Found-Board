'use client';

import { useState, useEffect } from 'react';
import { resolveReportAction } from './actions';

export default function Home() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'lost', 'found'

  // Form State
  const [formData, setFormData] = useState({
    kind: 'lost',
    title: '',
    description: '',
    location: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  // Gemini Title Suggestion State
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const [suggestNotice, setSuggestNotice] = useState(null);

  // Resolving action state per item
  const [resolvingId, setResolvingId] = useState(null);

  // Fetch reports from API backed by SQLite
  const fetchReports = async (kindFilter = filter) => {
    try {
      setLoading(true);
      const url = kindFilter === 'all' ? '/api/reports' : `/api/reports?kind=${kindFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filter);
  }, [filter]);

  // Form input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Suggest title using Gemini via server API
  const handleSuggestTitle = async () => {
    setSuggestNotice(null);
    if (!formData.description.trim()) {
      setSuggestNotice({
        type: 'warning',
        text: 'Please enter a description first to get a suggested title.',
      });
      return;
    }

    setSuggestingTitle(true);
    try {
      const res = await fetch('/api/suggest-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.suggestedTitle) {
        // Fill the editable title with the draft
        setFormData((prev) => ({ ...prev, title: data.suggestedTitle }));
        if (formErrors.title) {
          setFormErrors((prev) => ({ ...prev, title: null }));
        }
        setSuggestNotice({
          type: 'success',
          text: 'Title draft generated! You can edit it freely before posting.',
        });
      } else {
        // If Gemini fails, show a short message and keep manual posting available
        setSuggestNotice({
          type: 'error',
          text: data.error || 'Gemini title suggestion failed. You can type a manual title below.',
        });
      }
    } catch (err) {
      setSuggestNotice({
        type: 'error',
        text: 'Gemini title suggestion failed. You can type a manual title below.',
      });
    } finally {
      setSuggestingTitle(false);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage(null);

    // Client-side validation
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required.';
    if (!formData.description.trim()) errors.description = 'Description is required.';
    if (!formData.location.trim()) errors.location = 'Location is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setFormErrors(data.errors);
        } else {
          setSubmitMessage({ type: 'error', text: data.error || 'Failed to submit report.' });
        }
        return;
      }

      // Success
      setFormData({
        kind: 'lost',
        title: '',
        description: '',
        location: '',
      });
      setFormErrors({});
      setSuggestNotice(null);
      setSubmitMessage({ type: 'success', text: 'Report published successfully!' });
      // Refresh current board
      await fetchReports(filter);
    } catch (err) {
      setSubmitMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Mark as Resolved via Server Action
  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      const res = await resolveReportAction(id);
      if (res.success) {
        // Refresh the board after the update
        await fetchReports(filter);
      } else {
        alert(res.error || 'Failed to mark report as resolved.');
      }
    } catch (error) {
      console.error('Resolve error:', error);
      alert('Error updating status.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="text-indigo-600">🏫</span> Classroom Lost &amp; Found Board
              </h1>
              <p className="mt-1 text-slate-600 text-sm">
                Report lost or found belongings, browse recent posts, and mark items resolved once returned.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ● Live Local SQLite
              </span>
            </div>
          </div>
        </header>

        {/* Main Grid: Form (Left) & Browse List (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Report Form Column */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">Post a Report</h2>
              <p className="text-xs text-slate-500 mt-1">
                Fill in the item details to share with classmates.
              </p>
            </div>

            {submitMessage && (
              <div
                className={`mb-5 p-3.5 rounded-xl text-sm border ${
                  submitMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {submitMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Kind Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                  Report Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, kind: 'lost' }))}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition ${
                      formData.kind === 'lost'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-200 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🔍</span> I Lost Something
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, kind: 'found' }))}
                    className={`py-2.5 px-4 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition ${
                      formData.kind === 'found'
                        ? 'bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-200 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>🎁</span> I Found Something
                  </button>
                </div>
                {formErrors.kind && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.kind}</p>
                )}
              </div>

              {/* Description Field (User enters description before requesting title suggestion) */}
              <div>
                <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Found a blue bottle with a flip lid near the library entrance."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition resize-none ${
                    formErrors.description
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {formErrors.description && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.description}</p>
                )}
              </div>

              {/* Location Field */}
              <div>
                <label htmlFor="location" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Location <span className="text-rose-500">*</span>
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Library 2nd Floor, Room 302, Gym bleachers"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition ${
                    formErrors.location
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {formErrors.location && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.location}</p>
                )}
              </div>

              {/* Title Field with Suggest Title Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="title" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Item Title <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestTitle}
                    disabled={suggestingTitle}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    <span>✨</span>
                    {suggestingTitle ? 'Suggesting...' : 'Suggest Title'}
                  </button>
                </div>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Type title manually or click Suggest Title above"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none transition ${
                    formErrors.title
                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
                {suggestNotice && (
                  <div
                    className={`mt-1.5 p-2 rounded-lg text-xs flex items-center justify-between ${
                      suggestNotice.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : suggestNotice.type === 'warning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span>{suggestNotice.text}</span>
                    <button
                      type="button"
                      onClick={() => setSuggestNotice(null)}
                      className="ml-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {formErrors.title && (
                  <p className="mt-1 text-xs text-rose-600">{formErrors.title}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 shadow-sm transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Publishing report...</span>
                ) : (
                  <span>Publish Report</span>
                )}
              </button>
            </form>
          </div>

          {/* Browse List Column */}
          <div className="lg:col-span-7 space-y-5">
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Browse Reports</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {reports.length}
                </span>
              </div>

              {/* Filter Tabs: All, Lost, Found */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl" role="tablist">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('lost')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === 'lost'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Lost
                </button>
                <button
                  onClick={() => setFilter('found')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === 'found'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Found
                </button>
              </div>
            </div>

            {/* List Content */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                Loading reports from SQLite database...
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <div className="text-3xl mb-2">📦</div>
                <h3 className="text-sm font-bold text-slate-700">No reports found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {filter === 'all'
                    ? 'No items have been reported yet. Use the form to submit one!'
                    : `No "${filter}" items listed currently. Try switching filters.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                      report.status === 'resolved'
                        ? 'border-slate-200 bg-slate-50/70'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Kind Badge */}
                        {report.kind === 'lost' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span>🔍</span> Lost
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            <span>🎁</span> Found
                          </span>
                        )}

                        {/* Status Badge: Open or Resolved */}
                        {report.status === 'resolved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            ● Open
                          </span>
                        )}
                      </div>

                      <time className="text-[11px] text-slate-400 font-mono">
                        {new Date(report.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>

                    <h3 className={`text-base font-bold mt-2.5 ${
                      report.status === 'resolved' ? 'text-slate-600 line-through' : 'text-slate-900'
                    }`}>
                      {report.title}
                    </h3>

                    <p className="text-sm text-slate-600 mt-1.5 whitespace-pre-line leading-relaxed">
                      {report.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="text-slate-400">📍</span> {report.location}
                      </div>

                      {/* Resolve Action Button for Open items */}
                      {report.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleResolve(report.id)}
                          disabled={resolvingId === report.id}
                          className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
                        >
                          {resolvingId === report.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <span>✓</span> Mark as Resolved
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
