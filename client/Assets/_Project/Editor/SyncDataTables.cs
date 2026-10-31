#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEngine;

namespace ArushAlUsur.EditorTools
{
    /// <summary>
    /// Copies repo-root data/*.json into StreamingAssets and Resources Tables.
    /// Menu: Tools/Arush/Sync Data Tables
    /// </summary>
    public static class SyncDataTables
    {
        private const string RelativeData = "../../data";
        private const string StreamingDest = "Assets/_Project/StreamingAssets/Tables";
        private const string ResourcesDest = "Assets/_Project/Resources/Tables";

        [MenuItem("Tools/Arush/Sync Data Tables")]
        public static void Sync()
        {
            var projectRoot = Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
            var dataDir = Path.GetFullPath(Path.Combine(projectRoot, RelativeData));
            if (!Directory.Exists(dataDir))
            {
                Debug.LogError("[Arush] data/ not found at: " + dataDir);
                return;
            }

            CopyJson(dataDir, Path.Combine(projectRoot, StreamingDest));
            CopyJson(dataDir, Path.Combine(projectRoot, ResourcesDest));
            AssetDatabase.Refresh();
            Debug.Log("[Arush] Synced data tables → StreamingAssets + Resources.");
        }

        private static void CopyJson(string srcDir, string dstDir)
        {
            Directory.CreateDirectory(dstDir);
            foreach (var file in Directory.GetFiles(srcDir, "*.json"))
            {
                var name = Path.GetFileName(file);
                File.Copy(file, Path.Combine(dstDir, name), overwrite: true);
            }
        }
    }
}
#endif
