function Messages() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Care Team Messages
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Direct secure communication with your obstetrics healthcare provider.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-zinc-200">
        <h2 className="text-base font-semibold text-zinc-900 mb-3">Clinical Inbox</h2>
        <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-lg">
          <p className="text-xs font-semibold text-zinc-800">Dr. Sharma · Obstetrics Department</p>
          <p className="text-sm text-zinc-600 mt-1">
            "Your 28-week laboratory blood panel results look normal. Please continue your daily iron and calcium supplementation schedule as discussed."
          </p>
          <span className="text-[11px] text-zinc-400 mt-2 block">Today at 11:30 AM</span>
        </div>
      </div>
    </div>
  );
}

export default Messages;