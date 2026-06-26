import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Button } from './Button'

describe('Button', () => {
  it('fires onClick when used as a button', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Validate</Button>)

    await user.click(screen.getByRole('button', { name: 'Validate' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders as a link when `to` is provided', () => {
    render(
      <MemoryRouter>
        <Button to="/validate">Go</Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Go' })
    expect(link).toHaveAttribute('href', '/validate')
  })
})
