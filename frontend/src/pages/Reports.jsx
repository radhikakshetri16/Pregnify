function Reports() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Medical & Ultrasound Reports
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Access laboratory test results, ultrasound scans, and clinical notes.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Diagnostic Records</h2>
        <div className="space-y-3 text-sm">
          <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Anomaly Scan (20-Week Ultrasound)</p>
              <p className="text-xs text-zinc-500 mt-0.5">Normal fetal anatomy and cardiac development confirmed.</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium">Normal</span>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Complete Blood Count & Hemoglobin</p>
              <p className="text-xs text-zinc-500 mt-0.5">Hb: 12.2 g/dL · Normal maternal range</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium">Normal</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;