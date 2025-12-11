import { N8nClient } from './n8nClient';

async function main() {
  try {
    const n8n = new N8nClient();

    console.log('🚀 n8n Cloudに接続中...');
    console.log(`📍 URL: ${process.env.N8N_INSTANCE_URL}/api/v1/workflows`);

    // ワークフロー一覧を取得
    const workflows = await n8n.getWorkflows();
    console.log('✅ 接続成功！');
    console.log(`📋 既存のワークフロー数: ${workflows.data?.length || 0}`);

    if (workflows.data && workflows.data.length > 0) {
      console.log('\nワークフロー一覧:');
      workflows.data.forEach((wf: any) => {
        console.log(`  - ${wf.name} (ID: ${wf.id})`);
      });
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:');
    if (error.response) {
      console.error(`  ステータス: ${error.response.status}`);
      console.error(`  メッセージ: ${error.response.data?.message || error.message}`);
      console.error(`  レスポンスデータ:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`  ${error.message}`);
    }
    console.error('\n💡 .envファイルの設定を確認してください');
  }
}

main();
