import React, { useState, useEffect } from 'react'
import Config from 'react-native-config'

import { downloadGenesis, storeGenesis } from '../../genesis-utils'
import { PollingInboundTransporter } from '../../transporters'

import indy from 'rn-indy-sdk'
import {
  Agent,
  ConnectionEventType,
  BasicMessageEventType,
  ConsoleLogger,
  LogLevel,
  HttpOutboundTransporter,
} from 'aries-framework'

const AgentContext = React.createContext({})

interface Props {
  children: any
}

const AgentProvider: React.FC<Props> = ({ children }) => {
  const [agent, setAgent] = useState<any>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initAgent()
  }, [])

  const initAgent = async () => {
    console.info('Initializing Agent')

    const genesis = await downloadGenesis(Config.GENESIS_URL)
    const genesisPath = await storeGenesis(genesis, 'genesis.txn')

    const agentConfig = {
      label: 'Aries Bifold',
      mediatorUrl: Config.MEDIATOR_URL,
      walletConfig: { id: 'wallet4' },
      walletCredentials: { key: '123' },
      autoAcceptConnections: true,
      poolName: 'test-183',
      genesisPath,
      logger: new ConsoleLogger(LogLevel.debug),
      indy,
    }

    let newAgent = new Agent(agentConfig)

    let outbound = new HttpOutboundTransporter(newAgent)

    newAgent.setInboundTransporter(new PollingInboundTransporter())
    newAgent.setOutboundTransporter(outbound)

    await newAgent.init()

    setAgent(newAgent)
    setLoading(false)

    console.info('Agent has been initialized')

    const handleBasicMessageReceive = (event: any) => {
      console.log(`New Basic Message with verkey ${event.verkey}:`, event.message)
    }
    newAgent.basicMessages.events.on(BasicMessageEventType.MessageReceived, handleBasicMessageReceive)

    const handleConnectionStateChange = (event: any) => {
      console.log(
        `connection event for: ${event.connectionRecord.id}, previous state -> ${event.previousState} new state: ${event.connectionRecord.state}`
      )
    }
    newAgent.connections.events.on(ConnectionEventType.StateChanged, handleConnectionStateChange)

    console.log('connections:', await newAgent.connections.getAll())
  }

  return (
    <AgentContext.Provider
      value={{
        agent,
        loading,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export default AgentContext
export { AgentProvider }
