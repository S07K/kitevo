import Link from 'next/link'

async function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is the dashboard page</p>
      <Link href="/">Home</Link>
    </div>
  );
}

export default Dashboard;