import Link from 'next/link'

async function Dashboard() {
    const res = await fetch('https://api.github.com')
    const data = await res.json()
    console.log(data)
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is the dashboard page</p>
      <Link href="/">Home</Link>
    </div>
  );
}

export default Dashboard;