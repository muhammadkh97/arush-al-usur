using UnityEngine;

namespace ArushAlUsur.Core
{
    /// <summary>
    /// Minimal service locator for Soft Launch — enough for U1–U5 wiring.
    /// Replace with a fuller DI container only if Soft scope demands it.
    /// </summary>
    public sealed class BootServices : MonoBehaviour
    {
        public static BootServices Instance { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }
}
