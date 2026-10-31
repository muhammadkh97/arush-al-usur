using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace ArushAlUsur.Data
{
    /// <summary>
    /// Loads shared balance JSON from StreamingAssets/Tables.
    /// On Android, prefer UnityWebRequest for StreamingAssets paths.
    /// Do not hardcode economy numbers in C# — always load from tables.
    /// </summary>
    public static class JsonTableLoader
    {
        public static string TablesRoot =>
            Path.Combine(Application.streamingAssetsPath, "Tables");

        public static string GetTablePath(string fileName)
        {
            if (!fileName.EndsWith(".json"))
                fileName += ".json";
            return Path.Combine(TablesRoot, fileName);
        }

        /// <summary>
        /// Synchronous read for Editor / desktop. For Android builds use LoadTextAsync.
        /// </summary>
        public static string LoadText(string fileName)
        {
            var path = GetTablePath(fileName);
#if UNITY_ANDROID && !UNITY_EDITOR
            Debug.LogWarning(
                "[JsonTableLoader] Use LoadTextAsync on Android for: " + path);
#endif
            if (!File.Exists(path))
            {
                Debug.LogError("[JsonTableLoader] Missing table: " + path);
                return null;
            }
            return File.ReadAllText(path);
        }

        public static UnityWebRequest CreateStreamingRequest(string fileName)
        {
            var path = GetTablePath(fileName);
            var uri = path.Contains("://") ? path : "file://" + path;
            return UnityWebRequest.Get(uri);
        }
    }
}
