function Medicines() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Medications and Supplements
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage prescribed prenatal vitamins, supplements, and medication schedules.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Daily Prenatal Schedule</h2>
        <div className="space-y-3 text-sm">
          <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Prenatal Multivitamin (Folic Acid + Iron)</p>
              <p className="text-xs text-zinc-500 mt-0.5">1 tablet once daily with food</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-zinc-200 text-zinc-800 rounded-md font-medium">Morning</span>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900">Calcium & Vitamin D3</p>
              <p className="text-xs text-zinc-500 mt-0.5">1 tablet daily after lunch</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-zinc-200 text-zinc-800 rounded-md font-medium">Afternoon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Medicines;