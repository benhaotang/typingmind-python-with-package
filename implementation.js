async function execute_python({ code, packages }) {
  // Helper function to load the Pyodide script
  async function _loadScript(url) {
    if (!window.loadedScripts) {
      window.loadedScripts = {};
    }

    if (window.loadedScripts[url]) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    }).then(() => (window.loadedScripts[url] = true));
  }

  // Load Pyodide if it's not already loaded
  await _loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

  // Initialize Pyodide
  let pyodide;
  if (!window.pyodide) {
    pyodide = await loadPyodide();
    window.pyodide = pyodide; // Cache it globally for future use
  } else {
    pyodide = window.pyodide;
  }

  try {
    // Redirect standard output to a variable
    pyodide.runPython(`
      import io
      import sys
      
      sys.stdout = io.StringIO()
    `);

    // Load packages
    if (packages && packages.length > 0) {
      for (const packageName of packages) {
        try {
          await pyodide.loadPackage(packageName);
        } catch (e) {
          // If packages fail to load, notify in the output
          return { error: `Failed to load package ${packageName}. Error: ${e.message}` };
        }
      }
    }

    // Execute the Python code
    pyodide.runPython(code);

    // Get the captured output
    let output = pyodide.runPython("sys.stdout.getvalue()");

    // Reset standard output
    pyodide.runPython(`
        sys.stdout = sys.__stdout__
    `);

    return { output: output };
  } catch (error) {
    return { error: error.message };
  }
}
