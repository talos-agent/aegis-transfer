import { render, screen } from '@testing-library/react'
import { TransferList } from '../components/TransferList'

describe('TransferList', () => {
  it('shows loading state initially', () => {
    render(<TransferList />)
    
    expect(screen.getByText('Loading transfers...')).toBeInTheDocument()
  })

  it('renders loading spinner', () => {
    render(<TransferList />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeTruthy()
  })
})
