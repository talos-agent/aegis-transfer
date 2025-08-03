import { render, screen } from '@testing-library/react'
import { ConnectWallet } from '../components/ConnectWallet'

describe('ConnectWallet', () => {
  it('renders the connect wallet component', () => {
    render(<ConnectWallet />)
    
    expect(screen.getByText('Connect your wallet to start sending secure transfers')).toBeInTheDocument()
  })

  it('shows connect wallet button when not connected', () => {
    render(<ConnectWallet />)
    
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('displays wallet connection message', () => {
    render(<ConnectWallet />)
    
    expect(screen.getByText('Connect your wallet to start sending secure transfers')).toBeInTheDocument()
  })
})
