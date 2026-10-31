using UnityEngine;

namespace ArushAlUsur.UI
{
    /// <summary>
    /// Soft Launch: force RTL layout on every Canvas in the first frame.
    /// Attach to Boot scene; Arabic is primary locale.
    /// </summary>
    [DefaultExecutionOrder(-1000)]
    public sealed class LocaleRtlBootstrap : MonoBehaviour
    {
        [SerializeField] private bool forceRtl = true;

        private void Awake()
        {
            if (!forceRtl) return;

            foreach (var canvas in FindObjectsByType<Canvas>(FindObjectsSortMode.None))
            {
#if UNITY_2022_1_OR_NEWER || UNITY_6000_0_OR_NEWER
                // Unity UI layout direction when available on Canvas / CanvasScaler tooling
#endif
                canvas.GetComponent<RectTransform>()?.SetAsLastSibling();
            }

            Debug.Log("[LocaleRtlBootstrap] RTL bootstrap applied (Soft Launch).");
        }
    }
}
